const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Check if we're on Mainnet network
  const network = await hre.ethers.provider.getNetwork();
  //CrowdfundingMarketplace CONTRACT

  // Deploy CrowdfundingMarketplace Contract
  console.log("\nDeploying CrowdfundingMarketplace contract...");
  const CrowdfundingMarketplace = await hre.ethers.getContractFactory(
    "CrowdfundingMarketplace"
  );
  const crowdfundingMarketplace = await CrowdfundingMarketplace.deploy();

  await crowdfundingMarketplace.deployed();

  console.log("\nDeployment Successful!");
  console.log("------------------------");
  console.log("NEXT_PUBLIC_OWNER_ADDRESS:", deployer.address);
  console.log(
    "NEXT_PUBLIC_crowdfundingMarketplace_ADDRESS:",
    crowdfundingMarketplace.address
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
