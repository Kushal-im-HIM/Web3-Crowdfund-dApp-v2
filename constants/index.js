export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
export const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
export const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;
export const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;

export const CAMPAIGN_CREATION_FEE = "1000000000000000000"; // 1 ETH in wei

// Validate required environment variables
if (typeof window !== "undefined") {
  if (!CONTRACT_ADDRESS) {
    console.error(
      "NEXT_PUBLIC_CONTRACT_ADDRESS is not set in environment variables"
    );
  }
  if (!PINATA_JWT && !PINATA_API_KEY) {
    console.warn(
      "Pinata IPFS credentials are not set. Image uploads will not work."
    );
  }
}

export const PINATA_CONFIG = {
  pinataApiKey: PINATA_API_KEY,
  pinataSecretApiKey: PINATA_SECRET_KEY,
  pinataJWT: PINATA_JWT,
};

export const NETWORK_CONFIGS = {
  localhost: {
    name: "Localhost",
    chainId: 31337,
    rpcUrl: "http://localhost:8545",
    blockExplorer: "http://localhost:8545",
  },
  holesky: {
    name: "Holesky Testnet",
    chainId: 17000,
    rpcUrl: "https://ethereum-holesky.publicnode.com",
    blockExplorer: "https://holesky.etherscan.io",
  },
};

export const SIDEBAR_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "FiHome",
    path: "/dashboard",
  },
  {
    id: "campaigns",
    label: "All Campaigns",
    icon: "FiGrid",
    path: "/campaigns",
  },
  {
    id: "create",
    label: "Create Campaign",
    icon: "FiPlus",
    path: "/create-campaign",
  },
  {
    id: "my-campaigns",
    label: "My Campaigns",
    icon: "FiUser",
    path: "/my-campaigns",
  },
  {
    id: "contributions",
    label: "My Contributions",
    icon: "FiHeart",
    path: "/contributions",
  },
  {
    id: "admin",
    label: "Admin Panel",
    icon: "FiSettings",
    path: "/admin",
    adminOnly: true,
  },
];
