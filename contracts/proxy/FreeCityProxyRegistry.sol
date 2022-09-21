// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./AuthenticatedProxy.sol";
import "./ProxyRegistry.sol";

contract FreeCityProxyRegistry is ProxyRegistry {

    string public constant name = "FCM Proxy Registry";

    event GrantAuthentication(address indexed);

    constructor ()
    {
        delegateProxyImplementation = address(new AuthenticatedProxy());
    }

    /**
     * Grant authentication to the `Exchange protocol contract
     *
     * @param authAddress Address of the contract to grant authentication
     */
    function grantAuthentication (address authAddress)
    onlyOwner
    external
    {
        contracts[authAddress] = true;
        emit GrantAuthentication(authAddress);
    }
}