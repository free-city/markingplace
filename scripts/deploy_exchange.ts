// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // const Action = await ethers.getContractFactory("Auction");
  // const action = await Action.deploy();

  // await action.deployed();
  const proxyRegisterAddress = "0x0C9070A48Be44D98c42e18DF4573030D9174EB66";
  const tokenTransferProxy = "0x2baa9863D48EAF6ac9Af87E7cD800Be87B51FE19";
  const feeAddress = "0xc1432Db8842742937E8b27475C9a220e63C2cCaD";
  const accounts = await ethers.provider.listAccounts();
  console.log(accounts[0]);
  // We get the contract to deploy
  const ExchangeCore = await ethers.getContractFactory("ExchangeCore");
  const ExchangeCoreInstance = await ExchangeCore.deploy(
    proxyRegisterAddress,
    tokenTransferProxy,
    "0x0000000000000000000000000000000000000000",
    feeAddress
  );
  await ExchangeCoreInstance.deployed();
  console.log("ExchangeCore deployed to:", ExchangeCoreInstance.address);

  // We get the contract to deploy
  const ExchangeOperator = await ethers.getContractFactory("ExchangeOperator");
  const ExchangeOperatorInstance = await ExchangeOperator.deploy(
    ExchangeCoreInstance.address
  );
  await ExchangeOperatorInstance.deployed();
  console.log(
    "ExchangeOperatorInstance deployed to:",
    ExchangeOperatorInstance.address
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
