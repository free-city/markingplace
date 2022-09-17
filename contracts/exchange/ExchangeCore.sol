// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./ArrayUtils.sol";
import "./SaleKindInterface.sol";
import "./ReentrancyGuarded.sol";
import "../proxy/ProxyRegistry.sol";
import "../proxy/AuthenticatedProxy.sol";
import "./SafeMath.sol";

contract ExchangeCore is ReentrancyGuarded, Ownable {

    /* User registry. */
    ProxyRegistry public registry;

    /* Cancelled / finalized orders, by hash. */
    mapping(bytes32 => bool) public cancelledOrFinalized;

    /* fee to pay to protocolFeeRecipient by order match caller.  */
    uint public protocolFee;

    /* Recipient of protocol fees. */
    address public protocolFeeRecipient;


    /* Inverse basis point. */
    uint public constant INVERSE_BASIS_POINT = 10000;

    /* An order on the exchange. */
    struct Order {
        /* Exchange address, intended as a versioning mechanism. */
        address exchange;
        /* Order seller address. */
        address seller;
        /* Order buyer address. */
        address buyer;
        /* Order maker adderss. */
        address maker;
        /* Token to be used. address(0) when ETH is used. */
        address tokenAddress;
        /* Target contract where tokenId exists */
        address target;
        /* Token id. Offchain id when token is not minted. */
        uint tokenId;
        /* Base price of the order (in paymentTokens). */
        uint price;
        /* Listing timestamp. */
        uint listingTime;
        /* Expiration timestamp - 0 for no expiry. */
        uint expirationTime;
        /* Order salt, used to prevent duplicate hashes. */
        uint salt;
    }
    
    event OrderCancelled(bytes32 indexed hash);
    event OrdersMatched(address indexed buyer, address indexed seller, uint indexed price, uint offchainTokenId,
        uint onchainTokenID);


    /**
     * @dev Change fee paid to protocol (owner only)
     * @param newProtocolFee New fee to set in basis points
     */
    function changeProtocolFee(uint newProtocolFee)
        public
        onlyOwner
    {
        require(protocolFee< type(uint16).max, "exceed max");
        protocolFee = newProtocolFee;
    }

    /**
     * @dev Change the protocol fee recipient (owner only)
     * @param newProtocolFeeRecipient New protocol fee recipient address
     */
    function changeProtocolFeeRecipient(address newProtocolFeeRecipient)
        public
        onlyOwner
    {
        protocolFeeRecipient = newProtocolFeeRecipient;
    }

    /**
     * Calculate size of an order struct when tightly packed
     * @return Size in bytes
     */
    function sizeOfOrder()
        internal
        pure
        returns (uint)
    {
        return (0x14 * 6) + (0x20 * 5);
    }

    /**
     * @dev Hash an order, returning the canonical order hash, without the message prefix
     * @param order Order to hash
     * @return hash of order
     */
    function hashOrder(Order memory order)
        internal
        pure
        returns (bytes32 hash)
    {
        /* Unfortunately abi.encodePacked doesn't work here, stack size constraints. */
        uint size = sizeOfOrder();
        bytes memory array = new bytes(size);
        uint index;
        assembly {
            index := add(array, 0x20)
        }
        index = ArrayUtils.unsafeWriteAddress(index, order.exchange);
        index = ArrayUtils.unsafeWriteAddress(index, order.seller);
        index = ArrayUtils.unsafeWriteAddress(index, order.buyer);
        index = ArrayUtils.unsafeWriteAddress(index, order.maker);
        index = ArrayUtils.unsafeWriteAddress(index, order.tokenAddress);
        index = ArrayUtils.unsafeWriteAddress(index, order.target);
        index = ArrayUtils.unsafeWriteUint(index, order.tokenId);
        index = ArrayUtils.unsafeWriteUint(index, order.price);
        index = ArrayUtils.unsafeWriteUint(index, order.listingTime);
        index = ArrayUtils.unsafeWriteUint(index, order.expirationTime);
        index = ArrayUtils.unsafeWriteUint(index, order.salt);
        assembly {
            hash := keccak256(add(array, 0x20), size)
        }
        return hash;
    }

    /**
     * @dev Hash an order, returning the hash that a client must sign, including the standard message prefix
     * @param order Order to hash
     * @return hash of message prefix and order hash per Ethereum format
     */
    function hashToSign(Order memory order)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashOrder(order)));
    }

    /**
     * @dev Assert an order is valid and return its hash
     * @param order Order to validate
     * @param signature ECDSA signature
     */
    function requireValidOrder(Order memory order, bytes memory signature)
        internal
        view
        returns (bytes32)
    {
        bytes32 hash = hashToSign(order);
        require(validateOrder(hash, order, signature));
        return hash;
    }

    /**
     * @dev Validate order parameters (does *not* check signature validity)
     * @param order Order to validate
     */
    function validateOrderParameters(Order memory order)
        internal
        view
        returns (bool)
    {
        /* Order must be targeted at this protocol version (this Exchange contract). */
        if (order.exchange != address(this)) {
            return false;
        }

        /* Order maker must be buyer or seller */
        if (order.buyer != order.maker && order.seller != order.maker) {
            return false;
        }

        /* Order must possess valid sale kind parameter combination. */
        if (!SaleKindInterface.validateParameters(order.listingTime, order.expirationTime)) {
            return false;
        }

        return true;
    }

    /**
     * @dev Validate a provided previously approved / signed order, hash, and signature.
     * @param hash Order hash (already calculated, passed to avoid recalculation)
     * @param order Order to validate
     * @param signature ECDSA signature
     */
    function validateOrder(bytes32 hash, Order memory order, bytes memory signature) 
        internal
        view
        returns (bool)
    {
        /* Not done in an if-conditional to prevent unnecessary ecrecover evaluation, which seems to happen even though
         * it should short-circuit. */

        /* Order must have valid parameters. */
        if (!validateOrderParameters(order)) {
            return false;
        }

        /* Order must have not been canceled or already filled. */
        if (cancelledOrFinalized[hash]) {
            return false;
        }

        (uint8 v, bytes32 r, bytes32 s) = splitSignature(signature);
        /* or (b) ECDSA-signed by maker. */
        if (ecrecover(hash, v, r, s) == order.maker) {
            return true;
        }

        return false;
    }

    function splitSignature(bytes memory sig)
        public
        pure
        returns (
            uint8 v,
            bytes32 r,
            bytes32 s
        )
    {
        require(sig.length == 65, "invalid signature length");

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }
    }

    /**
     * @dev Cancel an order, preventing it from being matched. Must be called by the maker of the order
     * @param order Order to cancel
     * @param signature ECDSA signature
     */
    function cancelOrder(Order memory order, bytes memory signature) 
        internal
    {
        /* CHECKS */

        /* Calculate order hash. */
        bytes32 hash = requireValidOrder(order, signature);

        /* Assert sender is authorized to cancel order. */
        require(msg.sender == order.maker);
  
        /* EFFECTS */
      
        /* Mark order as cancelled, preventing it from being matched. */
        cancelledOrFinalized[hash] = true;

        /* Log cancel event. */
        emit OrderCancelled(hash);
    }

    /**
     * @dev Calculate the price two orders would match at, if in fact they would match (otherwise fail)
     * @param buy Buy-side order
     * @param sell Sell-side order
     * @return Match price
     */
    function calculateMatchPrice(Order memory buy, Order memory sell)
        pure
        internal
        returns (uint)
    {
        /* Require buy price is equal or greater to seller price. */
        require(buy.price >= sell.price);
        
        return buy.price;
    }

    /**
     * @dev Return whether or not two orders can be matched with each other by basic parameters (does not check order
     * signatures / calldata or perform static calls)
     * @param buy Buy-side order
     * @param sell Sell-side order
     * @return Whether or not the two orders can be matched
     */
    function ordersCanMatch(Order memory buy, Order memory sell)
        internal
        view
        returns (bool)
    {
        return (
            /* Match version */
            (sell.exchange == buy.exchange) &&
            /* Match seller and buyer */
            ((sell.buyer == address(0) && buy.seller == sell.seller) ||
            (buy.seller == sell.seller && buy.buyer == sell.buyer)) &&
            /* Token must match */
            (sell.tokenAddress == buy.tokenAddress) && 
            /* Targets must match */
            (buy.target == sell.target) &&
            /* Must match token id in transaction on this order. */
            (buy.tokenId == sell.tokenId) &&
            /* Buyer offer must be greater than or equal to seller price */
            (buy.price >= sell.price) &&
            // /* Buy-side order must be settleable. */
            SaleKindInterface.canSettleOrder(buy.listingTime, buy.expirationTime) &&
            // /* Sell-side order must be settleable. */
            SaleKindInterface.canSettleOrder(sell.listingTime, sell.expirationTime)
        );
    }

    /**
     * @dev Atomically match two orders, ensuring validity of the match, and execute all associated state transitions.
     * Protected against reentrancy by a contract-global lock.
     * @param buy Buy-side order
     * @param buySignature Buy-side order signature
     * @param sell Sell-side order
     * @param sellSignature Sell-side order signature
     */
    function atomicMatch(Order memory buy, bytes memory buySignature, Order memory sell, bytes memory sellSignature)
        internal
        reentrancyGuard
    {
        /* CHECKS */
        require(buy.maker != sell.maker, "Order makers must not be same address");
      
        /* validate that buySig was signed by buy order maker. */
        bytes32 buyHash = requireValidOrder(buy, buySignature);

        /* validate that sellSig was signed by sell order maker. */
        bytes32 sellHash = requireValidOrder(sell, sellSignature);

        require(buyHash != sellHash, "Self-matching orders is prohibited");
        
        /* Orders must match. */
        require(ordersCanMatch(buy, sell));

        /* INTERACTIONS */

        /* Mint (if necessary) and transfer NFT. */
        uint tokenId = executeSellerPromise(sell, buy);

        /* Fetch creator of NFT */
        // IERC721 target = IERC721(sell.target);
        // address creator = target.creatorOf(tokenId);

        /* Execute funds transfer and pay fees. */
        uint price = executeFundsTransfer(buy, sell);

        /* EFFECTS */

        /* Mark orders hash as finalized, to prevent reuse. */
        cancelledOrFinalized[buyHash] = true;
        cancelledOrFinalized[sellHash] = true;

        /* Log match event. */
        emit OrdersMatched(buy.buyer, sell.seller, price, sell.tokenId, tokenId);
    }

    /**
     * @dev Execute all ERC20 token / Ether transfers associated with an order match (fees and buyer => seller transfer)
     * @param buy order
     * @param sell order
     */
    function executeFundsTransfer(Order memory buy, Order memory sell)
        internal
        returns (uint)
    {
        /* Calculate match price. */
        uint price = SaleKindInterface.calculateFinalPrice(sell.price, buy.price);

        /* Fees distribution */
        uint receiveAmount = price;
        uint calculatedProtocolFee = SafeMath.div(SafeMath.mul(protocolFee, price), INVERSE_BASIS_POINT);
        // uint calculatedCreatorFee = SafeMath.div(SafeMath.mul(creatorFee, price), INVERSE_BASIS_POINT);
        uint sellerFee = SafeMath.sub(receiveAmount, calculatedProtocolFee);

        /* ERC20 token */
        if (buy.tokenAddress != address(0)) {
            /* Retrieve delegateProxy contract. */
            OwnableDelegateProxy delegateProxy = registry.proxies(buy.buyer);

            /* Proxy must exist. */
            require(address(delegateProxy) != address(0));

            /* Assert implementation. */
            require(delegateProxy.implementation() == registry.delegateProxyImplementation());

            /* Access the passthrough AuthenticatedProxy. */
            AuthenticatedProxy proxy = AuthenticatedProxy(payable(address(delegateProxy)));

            /* Execute specified call to transfer protocol fee tokens through proxy. */
            bytes memory protocolFeeCallData = tokensTransferCalldata(buy.buyer, protocolFeeRecipient,
                                                                      calculatedProtocolFee);
            require(proxy.proxy(sell.tokenAddress, AuthenticatedProxy.HowToCall.Call, protocolFeeCallData));

            /* Execute specified call to transfer seller fee tokens through proxy. */
            bytes memory sellerFeeCallData = tokensTransferCalldata(buy.buyer, sell.seller, sellerFee);
            require(proxy.proxy(sell.tokenAddress, AuthenticatedProxy.HowToCall.Call, sellerFeeCallData));
        } else {
            /* validate received amount is higher than price */
            require(msg.value >= price, "send more eth");
            
            /* transfer fee to protocol */
            payable(protocolFeeRecipient).sendValue(calculatedProtocolFee);

            /* transfer fee to protocol */
            // payable(creator).transfer(calculatedCreatorFee);

            /* transfer payement to seller */
            payable(sell.seller).transfer(sellerFee);
        }

        return price;
    }

    /**
     * @dev token transfer calldata.
     * @param from address
     * @param to address
     * @param amount of tokens to transfer
     */
    function tokensTransferCalldata(address from, address to, uint256 amount)
        internal
        pure
        returns(bytes memory)
    {
        return abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount);
    }

    function executeSellerPromise(Order memory sell, Order memory buy)
        internal
        returns(uint)
    {
        /* Retrieve delegateProxy contract. */
        OwnableDelegateProxy delegateProxy = registry.proxies(sell.seller);

        /* Proxy must exist. */
        require(address(delegateProxy) != address(0));

        /* Assert implementation. */
        require(delegateProxy.implementation() == registry.delegateProxyImplementation());

        /* Access the passthrough AuthenticatedProxy. */
        AuthenticatedProxy proxy = AuthenticatedProxy(payable(address(delegateProxy)));

        uint tokenId = sell.tokenId;

        // /* Execute specified call to transfer asset through proxy. */
        bytes memory callData = sellerCallDataFromOrders(buy.buyer, sell.seller, tokenId);
        require(proxy.proxy(sell.target, AuthenticatedProxy.HowToCall.Call, callData), "Failed to transfer NFT");

        return tokenId;
    }

    function sellerCallDataFromOrders(address buyer, address seller, uint tokenId)
        internal
        pure
        returns(bytes memory)
    {
        return abi.encodeWithSignature("safeTransferFrom(address,address,uint256)", seller, buyer, tokenId);
    }
}