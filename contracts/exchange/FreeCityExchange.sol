// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Exchange.sol";

contract FreeCityExchange is Exchange{

    string public constant name = "FreeCity Exchange";
    string public constant version = "1.0";
    string public constant codename = "FreeCity";

    /**
     * @dev Initialize a PlaytipusExchange instance
     * @param registryAddress Address of the registry instance which this Exchange instance will use
     * @param _protocolFee Fee transfer to protocolFeeAddress at every sale with INVERSE_BASIS_POINT
     * @param protocolFeeAddress Address to transfer protocol fees to
     */
    constructor (
        ProxyRegistry registryAddress,
        uint _protocolFee,
        address protocolFeeAddress)
    {
        registry = registryAddress;
        protocolFee = _protocolFee;
        protocolFeeRecipient = protocolFeeAddress;
    }
}