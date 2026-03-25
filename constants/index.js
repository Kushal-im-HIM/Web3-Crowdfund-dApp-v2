// ─── Network Switch ────────────────────────────────────────────────────────
// Change NEXT_PUBLIC_NETWORK in .env.local to "localhost" or "sepolia"
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "localhost";
const IS_LOCALHOST = NETWORK === "localhost";

// ─── Active addresses (auto-selected by NETWORK) ──────────────────────────
export const CONTRACT_ADDRESS = IS_LOCALHOST
  ? process.env.NEXT_PUBLIC_LOCALHOST_CONTRACT_ADDRESS
  : process.env.NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS;

export const MILESTONE_MANAGER_ADDRESS = IS_LOCALHOST
  ? process.env.NEXT_PUBLIC_LOCALHOST_MILESTONE_ADDRESS
  : process.env.NEXT_PUBLIC_SEPOLIA_MILESTONE_ADDRESS;

export const ADMIN_ADDRESS = IS_LOCALHOST
  ? process.env.NEXT_PUBLIC_LOCALHOST_ADMIN_ADDRESS
  : process.env.NEXT_PUBLIC_SEPOLIA_ADMIN_ADDRESS;

// ─── Active chain config (auto-selected by NETWORK) ───────────────────────
export const ACTIVE_NETWORK = {
  name: IS_LOCALHOST ? "Localhost" : "Sepolia",
  chainId: IS_LOCALHOST
    ? parseInt(process.env.NEXT_PUBLIC_LOCALHOST_CHAIN_ID) || 1337
    : parseInt(process.env.NEXT_PUBLIC_SEPOLIA_CHAIN_ID) || 11155111,
  rpcUrl: IS_LOCALHOST
    ? process.env.NEXT_PUBLIC_LOCALHOST_RPC_URL || "http://127.0.0.1:8545"
    : process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
  blockExplorer: IS_LOCALHOST
    ? null
    : "https://sepolia.etherscan.io",
  isLocalhost: IS_LOCALHOST,
};

// ─── Pinata / IPFS ────────────────────────────────────────────────────────
export const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
export const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;
export const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
export const PINATA_CONFIG = { pinataApiKey: PINATA_API_KEY, pinataSecretApiKey: PINATA_SECRET_KEY, pinataJWT: PINATA_JWT };

// ─── App constants ────────────────────────────────────────────────────────
// FIX (Issue #6): Was "1000000000000000000" (1 ETH) but the Solidity contract defines
// CAMPAIGN_CREATION_FEE as 0.0001 ether (100000000000000 wei). Any frontend logic using
// this constant for balance checks or display would show the wrong value.
// Original: export const CAMPAIGN_CREATION_FEE = "1000000000000000000"; // 1 ETH in wei
export const CAMPAIGN_CREATION_FEE = "100000000000000"; // 0.0001 ETH in wei — matches contract

// Matches Solidity MilestoneStatus enum order exactly
export const STATUS_LABELS = ["Pending", "Submitted", "Approved", "Rejected", "Released", "Refunded"];

// ─── Sidebar nav ──────────────────────────────────────────────────────────
export const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "FiHome", path: "/dashboard" },
  { id: "campaigns", label: "All Campaigns", icon: "FiGrid", path: "/campaigns" },
  { id: "create", label: "Create Campaign", icon: "FiPlus", path: "/create-campaign" },
  { id: "my-campaigns", label: "My Campaigns", icon: "FiUser", path: "/my-campaigns" },
  { id: "contributions", label: "My Contributions", icon: "FiHeart", path: "/contributions" },
  // New: Creator Transparency Dashboard
  { id: "transparency", label: "Transparency", icon: "FiSearch", path: "/transparency" },
  { id: "admin", label: "Admin Panel", icon: "FiSettings", path: "/admin", adminOnly: true },
];

// ─── Dev warnings ─────────────────────────────────────────────────────────
if (typeof window !== "undefined") {
  if (!CONTRACT_ADDRESS) console.error(`[${NETWORK}] CONTRACT_ADDRESS is not set`);
  if (!MILESTONE_MANAGER_ADDRESS) console.error(`[${NETWORK}] MILESTONE_MANAGER_ADDRESS is not set`);
  if (!PINATA_JWT && !PINATA_API_KEY) console.warn("Pinata IPFS credentials not set — uploads will fail");
}
