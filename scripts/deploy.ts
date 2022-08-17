import { ethers } from "hardhat";
import * as fs from "fs";

const { PUBLIC_KEY_PROD } = process.env;

async function main() {
  const outputFileName = "./deployments/production.env" + new Date().getTime();
  const protocolFee = 500;

  const freeCityProxyRegistry = await ethers.getContractFactory(
    "FreeCityProxyRegistry"
  );
  const proxyRegistry = await freeCityProxyRegistry.deploy();
  await proxyRegistry.deployed();

  console.log("Deployed Proxy Registry");

  fs.appendFileSync(
    outputFileName,
    "REACT_APP_PROXY_REGISTRY = " + proxyRegistry.address + "\n"
  );

  const erc721BluePrint = await ethers.getContractFactory("ERC721Instance");
  const erc721 = await erc721BluePrint.deploy("FCM", "FCM", "");
  await erc721.deployed();

  console.log("Deployed sERC721 to :", erc721.address);

  fs.appendFileSync(
    outputFileName,
    "REACT_APP__ERC721 = " + erc721.address + "\n"
  );

  const feeAddress: string = PUBLIC_KEY_PROD!;
  console.log("feeAddress", feeAddress);
  const exchangeBluePrint = await ethers.getContractFactory("FreeCityExchange");
  const exchange = await exchangeBluePrint.deploy(
    proxyRegistry.address,
    protocolFee,
    feeAddress
  );
  await exchange.deployed();
  fs.appendFileSync(
    outputFileName,
    "REACT_APP_EXCHANGE = " + exchange.address + "\n"
  );

  await proxyRegistry.grantAuthentication(exchange.address);

  console.log("Deployed Exchange");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
