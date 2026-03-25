// scripts/migrateSampleCampaign.js
// Demonstrates opt-in migration: creator registers campaign 1 in MilestoneManager
// and creates two milestones. No existing CrowdfundingMarketplace storage is altered.
// Run: npx hardhat run scripts/migrateSampleCampaign.js --network hardhat

const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer, creatorSigner] = await ethers.getSigners();

  const managerAddress = process.env.MILESTONE_MANAGER_ADDRESS;
  if (!managerAddress) throw new Error("Set MILESTONE_MANAGER_ADDRESS in .env");

  const MilestoneManager = await ethers.getContractAt("MilestoneManager", managerAddress);

  const CAMPAIGN_ID = 1; // Existing campaign ID in CrowdfundingMarketplace

  console.log("Registering campaign", CAMPAIGN_ID, "by creator", creatorSigner.address);
  const regTx = await MilestoneManager.connect(creatorSigner).registerCampaign(CAMPAIGN_ID);
  await regTx.wait();
  console.log("Campaign registered. Tx:", regTx.hash);

  const sevenDays = 7 * 24 * 60 * 60;

  // Milestone 1: MVP
  const m1Tx = await MilestoneManager.connect(creatorSigner).createMilestone(
    CAMPAIGN_ID,
    "MVP Release",
    "Build and deploy the minimum viable product",
    ethers.utils.parseEther("2"),
    sevenDays
  );
  await m1Tx.wait();
  console.log("Milestone 1 created. Tx:", m1Tx.hash);

  // Milestone 2: Beta Launch
  const m2Tx = await MilestoneManager.connect(creatorSigner).createMilestone(
    CAMPAIGN_ID,
    "Beta Launch",
    "Launch to 1000 beta users with full feature set",
    ethers.utils.parseEther("3"),
    sevenDays * 3
  );
  await m2Tx.wait();
  console.log("Milestone 2 created. Tx:", m2Tx.hash);

  console.log("\nMigration complete. Milestone count:", await MilestoneManager.milestoneCount(CAMPAIGN_ID));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
