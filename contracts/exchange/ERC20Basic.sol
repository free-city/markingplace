// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

abstract contract ERC20Basic {
    function totalSupply() public view virtual returns (uint256);
    function balanceOf(address who) public view virtual returns (uint256);
    function transfer(address to, uint256 value) public virtual returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
}