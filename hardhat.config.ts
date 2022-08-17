/* eslint-disable prettier/prettier */
import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import '@openzeppelin/hardhat-upgrades';

dotenv.config();




// extendEnvironment((hre) => {
//   hre.hi = "Hello, Hardhat!";
// });
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
   defaultNetwork: "localhost",
  
  networks: {
    hardhat: {
      mining: {
        auto: false,
        interval: 5000,
        mempool: {
          order: "fifo"
        }
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545/",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
      ],
      gas: 21000000,
      gasPrice: 46000000000,
    },
    polygon:{
      url: "https://polygon-mainnet.infura.io/v3/ff2efa316ea244268597e5eae99a4b3d",
      accounts:
      process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY,"0xee0832ebea198e742900d6c727413cef4b96edd053e5480b336809e06939005a","0x93fc31a4e847c6f1d6531b0d4d2aaf50c4803536f6a15bdc6ffa8f0e8504a9f4"] : [],
      chainId: 137,
      gas: 210000,
      gasPrice: 46000000000,
    },
    mumbai: {
      url:  "https://polygon-mumbai.infura.io/v3/ff2efa316ea244268597e5eae99a4b3d",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY,"0xee0832ebea198e742900d6c727413cef4b96edd053e5480b336809e06939005a","0x93fc31a4e847c6f1d6531b0d4d2aaf50c4803536f6a15bdc6ffa8f0e8504a9f4"] : [],
        chainId: 80001,
        gas: 210000,
        gasPrice: 46000000000,
    },
    rinkeby:{
      url:"https://rinkeby.infura.io/v3/a390f28959a5470e839632c8c5cb86a8",
      accounts:
      process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY,"0xee0832ebea198e742900d6c727413cef4b96edd053e5480b336809e06939005a","0x93fc31a4e847c6f1d6531b0d4d2aaf50c4803536f6a15bdc6ffa8f0e8504a9f4"] : [],
      chainId: 4,
      timeout: 4000000,
    },
    ropsten:{
      url:"https://ropsten.infura.io/v3/a390f28959a5470e839632c8c5cb86a8",
      accounts:
      process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY,"0xee0832ebea198e742900d6c727413cef4b96edd053e5480b336809e06939005a","0x93fc31a4e847c6f1d6531b0d4d2aaf50c4803536f6a15bdc6ffa8f0e8504a9f4"] : [],
      chainId: 3,
      gas: 2100000,
      gasPrice: 46000000000,
      timeout: 4000000,
    },
    goerli: {
      url: process.env.GOERLI_URL || "",
      accounts:
      process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY,"0xee0832ebea198e742900d6c727413cef4b96edd053e5480b336809e06939005a","0x93fc31a4e847c6f1d6531b0d4d2aaf50c4803536f6a15bdc6ffa8f0e8504a9f4", "0x59225b8006c67a90548484aaa49ef0d8078f3e05b3f7836a0a562e6736c3b500"] : [],
        chainId: 5,
        gas: 2100000,
        gasPrice: 46000000000,
        timeout: 4000000,
    },
    ccm: {
      url: "https://www.parallellu.com",
      accounts: ["0x60936fbda7fbe784c08e8c83a75b20235ac75699dedfb461f6c4c8c86b2d76f2"],
      chainId: 88,
    },
  },

  solidity: {
    version: "0.8.15",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
