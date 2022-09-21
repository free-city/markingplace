// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OwnedUpgradeabilityProxy.sol";

contract OwnableDelegateProxy is OwnedUpgradeabilityProxy {

    constructor(address owner, address initialImplementation, bytes memory data)
    {
        require((owner != address(0)) && (initialImplementation!= address(0)));
        setUpgradeabilityOwner(owner);
        _upgradeTo(initialImplementation);
        (bool ok, ) = initialImplementation.delegatecall(data);
        require(ok,"init implementation failed");
    }
    
    /**
    * @dev Fallback function allowing to perform a delegatecall to the given implementation.
    * This function will return whatever the implementation call returns
    */
    fallback() external {
        address _impl = implementation();
        require(_impl != address(0), "impl cannot be zero address");

        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), _impl, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(ptr, 0, size)

            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }
    
}