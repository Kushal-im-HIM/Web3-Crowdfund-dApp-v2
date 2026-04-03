// web3/scripts/deploy.js
// Deploy the unified Crowdfunding.sol contract.
// Usage:  npx hardhat run scripts/deploy.js --network localhost
//         npx hardhat run scripts/deploy.js --network sepolia

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // ── Oracle address ────────────────────────────────────────────────────────
  // In production set ORACLE_ADDRESS env var to your trusted oracle wallet.
  // In local dev we use the deployer address so you can call oracle functions
  // via Hardhat console without a separate service running.
  const oracleAddress = process.env.ORACLE_ADDRESS || deployer.address;
  console.log("Oracle address:", oracleAddress);

  // ── Deploy unified contract ───────────────────────────────────────────────
  const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
  const crowdfunding = await Crowdfunding.deploy(oracleAddress);
  await crowdfunding.deployed();

  console.log("\n✅  Crowdfunding (unified) deployed to:", crowdfunding.address);
  console.log("\n─── .env.local entries ────────────────────────────────────────");
  console.log(`NEXT_PUBLIC_LOCALHOST_CONTRACT_ADDRESS=${crowdfunding.address}`);
  console.log(`NEXT_PUBLIC_LOCALHOST_ORACLE_ADDRESS=${oracleAddress}`);
  console.log("────────────────────────────────────────────────────────────────\n");

  // Verify constructor params
  const oracle = await crowdfunding.oracleAddress();
  const fee = await crowdfunding.CAMPAIGN_CREATION_FEE();
  console.log("Oracle set to   :", oracle);
  console.log("Creation fee    :", ethers.utils.formatEther(fee), "ETH");
  console.log("Max milestones  :", (await crowdfunding.MAX_MILESTONES_PER_CAMPAIGN()).toString());
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
