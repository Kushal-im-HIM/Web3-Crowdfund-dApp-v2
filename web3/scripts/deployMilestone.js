// scripts/deployMilestone.js
// Deploy MilestoneManager, referencing the existing CrowdfundingMarketplace by address.
// Run: npx hardhat run scripts/deployMilestone.js --network <network>

const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MilestoneManager with account:", deployer.address);

  const oracleAddress = process.env.ORACLE_ADDRESS || deployer.address;
  console.log("Oracle address:", oracleAddress);

  const MilestoneManager = await ethers.getContractFactory("MilestoneManager");
  const manager = await MilestoneManager.deploy(oracleAddress);
  await manager.deployed();

  console.log("MilestoneManager deployed to:", manager.address);
  console.log("Owner:", await manager.owner());
  console.log("Oracle:", await manager.oracleAddress());

  // Verify on Etherscan if not local
  if (process.env.ETHERSCAN_API_KEY && network.name !== "hardhat") {
    console.log("Waiting 5 confirmations before Etherscan verification...");
    await manager.deployTransaction.wait(5);
    await hre.run("verify:verify", {
      address: manager.address,
      constructorArguments: [oracleAddress],
    });
    console.log("Verified on Etherscan.");
  }

  // Print suggested env var
  console.log("\n--- Add to your .env ---");
  console.log(`MILESTONE_MANAGER_ADDRESS=${manager.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
