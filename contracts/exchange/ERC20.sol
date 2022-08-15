// SPDX-License-Identifier: MIT
import "./ERC20Basic.sol";

pragma solidity ^0.8.0;

abstract contract ERC20 is ERC20Basic {
    function allowance(address owner, address spender)
    public view virtual returns (uint256);

    function transferFrom(address from, address to, uint256 value)
    public virtual returns (bool);

    function approve(address spender, uint256 value) public virtual returns (bool);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}