// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./AuthenticatedProxy.sol";
import "./ProxyRegistry.sol";

contract LandProxyRegistry is ProxyRegistry {

    string public constant name = "FCM Proxy Registry";

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
    public
    {
        contracts[authAddress] = true;
    }
}