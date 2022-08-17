// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SafeMath.sol";

library SaleKindInterface {
    /**
     * @dev Check whether the parameters of a sale are valid
     * @param listingTime Order start time.
     * @param expirationTime Order expiration time
     * @return Whether the parameters were valid
     */
    function validateParameters(uint listingTime, uint expirationTime)
        pure
        internal
        returns (bool)
    {
        /* Auctions must have a set expiration date. */
        return listingTime > 0 && expirationTime > 0 && expirationTime > listingTime;
    }

    /**
     * @dev Return whether or not an order can be settled
     * @dev Precondition: parameters have passed validateParameters
     * @param listingTime Order listing time
     * @param expirationTime Order expiration time
     */
    function canSettleOrder(uint listingTime, uint expirationTime)
        view
        internal
        returns (bool)
    {
        return (listingTime <= block.timestamp) && (block.timestamp < expirationTime);
    }

    /**
     * @dev Calculate the settlement price of an order
     * @dev Precondition: parameters have passed validateParameters.
     * @param sellerPrice Price 
     * @param buyerPrice Method of sale
     */
    function calculateFinalPrice(uint sellerPrice, uint buyerPrice)
        pure
        internal
        returns (uint finalPrice)
    {
        require(buyerPrice >= sellerPrice);
        return buyerPrice;
    }
}