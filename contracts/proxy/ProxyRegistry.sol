// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./OwnableDelegateProxy.sol";

contract ProxyRegistry is Ownable,ReentrancyGuard{


   event ProxyReg(address proxy,address user);
   event RevokeAuthentication(address indexed);
    /* DelegateProxy implementation contract. Must be initialized. */
    address  public delegateProxyImplementation;

    /* Authenticated proxies by user. */
    mapping(address => OwnableDelegateProxy) public proxies;

    /* Contracts allowed to call those proxies. */
    mapping(address => bool) public contracts;

    /**
     * Revoke access for specified contract. Can be done instantly.
     *
     * @dev ProxyRegistry owner only
     * @param addr Address of which to revoke permissions
     */    
    function revokeAuthentication (address addr)
        external
        onlyOwner
    {
        contracts[addr] = false;
        emit RevokeAuthentication(addr);
    }

    /**
     * Register a proxy contract with this registry
     *
     * @dev Must be called by the user which the proxy is for, creates a new AuthenticatedProxy
     * @return proxy (New AuthenticatedProxy contract)
     */
    function registerProxy()
        public
        nonReentrant
        returns (OwnableDelegateProxy proxy)
    {
        require(address(proxies[msg.sender]) == address(0) , "user must register proxy");
        proxy = new OwnableDelegateProxy(msg.sender, delegateProxyImplementation, abi.encodeWithSignature("initialize(address,address)", msg.sender, address(this)));
        proxies[msg.sender] = proxy;
        emit ProxyReg(address(proxy),msg.sender);
        return proxy;
    }

}