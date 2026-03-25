require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Kept from your existing config for stack support
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    sepolia: {
      // Prioritizes .env but keeps your fallback URL
      url: process.env.NETWORK_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/YJGj5hyqrUOA3m8a8qmge",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    holesky: {
      url: process.env.NETWORK_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      chainId: 17000,
    },
  },
  // Added from new feature file: Verification support
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  sourcify: {
    enabled: true,
  },
  paths: {
    artifacts: "./artifacts",
    sources: "./contracts",
    cache: "./cache",
    tests: "./test",
  },
};