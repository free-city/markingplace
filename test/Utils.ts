import { BigNumber } from "ethers";
import { ethers } from "hardhat";

export const weiToEth = (wei: BigNumber) => {
  const ether = ethers.utils.formatEther(wei.toString());
  return parseFloat(ether);
};

export const ethToWei = (eth: number) => {
  return ethers.utils.parseEther(eth.toString());
};
