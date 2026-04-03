// scripts/deployMilestone.js
//
// Deploy MilestoneManager, wiring it to the already-deployed CrowdfundingMarketplace.
//
// WATERFALL FIX: The constructor now takes TWO arguments:
//   1. oracleAddress           — trusted off-chain verifier
//   2. crowdfundingMarketplace — main marketplace contract address
//
// The marketplace reference is required so that voteMilestone() can read
// per-campaign ETH contributions for stake-weighted DAO voting under the
// waterfall model (where all backer ETH flows through the main campaign,
// not through per-milestone contributions).
//
// Prerequisites:
//   1. CrowdfundingMarketplace already deployed.
//   2. .env contains:
//        CROWDFUNDING_MARKETPLACE_ADDRESS=0x...   ← main marketplace
//        ORACLE_ADDRESS=0x...                      ← optional, defaults to deployer
//        ETHERSCAN_API_KEY=...                     ← optional, for verification
//
// Run: npx hardhat run scripts/deployMilestone.js --network <network>

const { ethers, network } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MilestoneManager with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.utils.formatEther(await deployer.getBalance()),
    "ETH"
  );

  // ── 1. Oracle address ───────────────────────────────────────────────────────
  const oracleAddress = process.env.ORACLE_ADDRESS || deployer.address;
  console.log("\nOracle address:     ", oracleAddress);

  // ── 2. Marketplace address (REQUIRED) ──────────────────────────────────────
  const marketplaceAddress = process.env.CROWDFUNDING_MARKETPLACE_ADDRESS;
  if (!marketplaceAddress) {
    throw new Error(
      "\n[deployMilestone] Missing CROWDFUNDING_MARKETPLACE_ADDRESS in .env\n" +
      "Deploy CrowdfundingMarketplace first, then set this env var before re-running.\n"
    );
  }
  console.log("Marketplace address:", marketplaceAddress);

  // ── 3. Deploy ───────────────────────────────────────────────────────────────
  console.log("\nDeploying MilestoneManager...");
  const MilestoneManager = await ethers.getContractFactory("MilestoneManager");

  // Constructor: (address _oracleAddress, address _crowdfundingMarketplace)
  const manager = await MilestoneManager.deploy(oracleAddress, marketplaceAddress);
  await manager.deployed();

  console.log("\n✅ MilestoneManager deployed!");
  console.log("   Address:          ", manager.address);
  console.log("   Owner:            ", await manager.owner());
  console.log("   Oracle:           ", await manager.oracleAddress());
  console.log("   Marketplace ref:  ", await manager.crowdfundingMarketplace());

  // ── 4. Etherscan verification (non-local only) ──────────────────────────────
  if (
    process.env.ETHERSCAN_API_KEY &&
    network.name !== "hardhat" &&
    network.name !== "localhost"
  ) {
    console.log("\nWaiting 5 confirmations before Etherscan verification...");
    await manager.deployTransaction.wait(5);
    await hre.run("verify:verify", {
      address: manager.address,
      constructorArguments: [oracleAddress, marketplaceAddress],
    });
    console.log("✅ Verified on Etherscan.");
  }

  // ── 5. Print env vars to add ────────────────────────────────────────────────
  console.log("\n--- Add to your .env.local (frontend) ---");
  if (network.name === "hardhat" || network.name === "localhost") {
    console.log(`NEXT_PUBLIC_LOCALHOST_MILESTONE_ADDRESS=${manager.address}`);
  } else {
    console.log(`NEXT_PUBLIC_SEPOLIA_MILESTONE_ADDRESS=${manager.address}`);
  }

  console.log("\n--- Add to your web3/.env (scripts / oracle) ---");
  console.log(`MILESTONE_MANAGER_ADDRESS=${manager.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
