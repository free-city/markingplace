import { ethers } from "hardhat";

async function main() {
  const ERC721Instance = await ethers.getContractFactory("ERC721Instance");
  const eRC721InstanceR = await ERC721Instance.deploy("FCM", "FCM", "test");

  await eRC721InstanceR.deployed();

  console.log("ERC721Instance deployed to:", eRC721InstanceR.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
