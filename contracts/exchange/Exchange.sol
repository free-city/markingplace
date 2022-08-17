// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ExchangeCore.sol";

contract Exchange is ExchangeCore {

    /**
     * @dev Call calculateFinalPrice - library function exposed for testing.
     */
    function calculateFinalPrice(uint sellerPrice, uint buyerPrice)
        public
        pure
        returns (uint)
    {
        return SaleKindInterface.calculateFinalPrice(sellerPrice, buyerPrice);
    }

    /*
     * @dev Call hashOrder - Stack too deep limitation workaround, hopefully temporary.
     */
    function hashOrder_(
        address[6] memory addrs,
        uint[5] memory uints)
        public
        pure
        returns (bytes32)
    {
        return hashOrder(
            Order(addrs[0], addrs[1], addrs[2], addrs[3], addrs[4], addrs[5], uints[0],  uints[1], uints[2],
                  uints[3], uints[4])
        );
    }

    /**
     * @dev Call hashToSign - Stack too deep limitation workaround, hopefully temporary.
     */
    function hashToSign_(
        address[6] memory addrs,
        uint[5] memory uints)
        public
        pure
        returns (bytes32)
    { 
        return hashToSign(
            Order(addrs[0], addrs[1], addrs[2], addrs[3], addrs[4], addrs[5], uints[0], uints[1], uints[2],
                  uints[3], uints[4])
        );
    }

    /**
     * @dev Call validateOrderParameters - Stack too deep limitation workaround, hopefully temporary.
     */
    function validateOrderParameters_ (
        address[6] memory addrs,
        uint[5] memory uints)
        view
        public
        returns (bool)
    {
        Order memory order = Order(addrs[0], addrs[1], addrs[2], addrs[3], addrs[4], addrs[5], uints[0],
                                   uints[1], uints[2], uints[3], uints[4]);
        return validateOrderParameters(
          order
        );
    }

    /**
     * @dev Call validateOrder - Stack too deep limitation workaround, hopefully temporary.
     */
    function validateOrder_ (
        address[6] memory addrs,
        uint[5] memory uints,
        bytes memory signature)
        view
        public
        returns (bool)
    {
        Order memory order = Order(addrs[0], addrs[1], addrs[2], addrs[3], addrs[4], addrs[5], uints[0],
                                   uints[1], uints[2], uints[3], uints[4]);
        return validateOrder(
          hashToSign(order),
          order,
          signature
        );
    }

    /**
     * @dev Call cancelOrder - Stack too deep limitation workaround, hopefully temporary.
     */
    function cancelOrder_(
        address[6] memory addrs,
        uint[5] memory uints,
        bytes memory signature)
        public
    {

        return cancelOrder(
          Order(addrs[0], addrs[1], addrs[2], addrs[3], addrs[4], addrs[5], uints[0], uints[1], uints[2],
                uints[3], uints[4]),
          signature
        );
    }

    /**
     * @dev Call ordersCanMatch - Stack too deep limitation workaround, hopefully temporary.
     */
    function ordersCanMatch_(
        address[12] memory addrs,
        uint[10] memory uints)
        public
        view
        returns (bool)
    {
        Order memory buy = Order(addrs[0], addrs[1], addrs[2], addrs[3], addrs[4], addrs[5], uints[0], 
                                 uints[1], uints[2], uints[3], uints[4]);
        Order memory sell = Order(addrs[6], addrs[7], addrs[8], addrs[9], addrs[10], addrs[11], uints[5],
                                  uints[6], uints[7], uints[8], uints[9]);
        return ordersCanMatch(
          buy,
          sell
        );
    }

    /**
     * @dev Call atomicMatch - Stack too deep limitation workaround, hopefully temporary.
     */
    function atomicMatch_(
        address[12] memory addrs,
        uint[10] memory uints,
        bytes memory buyerSignature,
        bytes memory sellerSignature)
        public
        payable
    {

        return atomicMatch(
          Order(addrs[0], addrs[1], addrs[2], addrs[3], addrs[4], addrs[5], uints[0], uints[1],
                uints[2], uints[3], uints[4]),
          buyerSignature,
          Order(addrs[6], addrs[7], addrs[8], addrs[9], addrs[10], addrs[11], uints[5], uints[6],
                uints[7], uints[8], uints[9]),
          sellerSignature
        );
    }
}