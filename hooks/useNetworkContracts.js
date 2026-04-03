/**
 * hooks/useNetworkContracts.js
 *
 * MANDATE 1 — Single contract configuration.
 *
 * What changed:
 *   • milestoneAddress / MILESTONE_MANAGER_ADDRESS removed entirely.
 *     All hooks now resolve to a single `contractAddress`.
 *   • Env var names are UNCHANGED — NEXT_PUBLIC_*_CONTRACT_ADDRESS still
 *     points to the deployed unified Crowdfunding.sol.
 *   • The deprecated MILESTONE_MANAGER_ADDRESS export is kept as an alias
 *     for CONTRACT_ADDRESS so any missed import sites don't hard-crash
 *     during the migration window.
 *
 * .env.local keys required (unchanged names):
 *   NEXT_PUBLIC_LOCALHOST_CONTRACT_ADDRESS=0x...
 *   NEXT_PUBLIC_LOCALHOST_ADMIN_ADDRESS=0x...
 *   NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS=0x...
 *   NEXT_PUBLIC_SEPOLIA_ADMIN_ADDRESS=0x...
 */

import { useNetwork } from "wagmi";

// ── Chain configuration map ──────────────────────────────────────────────────
const CHAIN_CONFIGS = {
  // Sepolia testnet
  11155111: {
    contractAddress: process.env.NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS,
    adminAddress: process.env.NEXT_PUBLIC_SEPOLIA_ADMIN_ADDRESS,
    name: "Sepolia",
    isLocalhost: false,
    blockExplorer: "https://sepolia.etherscan.io",
  },
  // Hardhat — default chain ID
  1337: {
    contractAddress: process.env.NEXT_PUBLIC_LOCALHOST_CONTRACT_ADDRESS,
    adminAddress: process.env.NEXT_PUBLIC_LOCALHOST_ADMIN_ADDRESS,
    name: "Localhost",
    isLocalhost: true,
    blockExplorer: null,
  },
  // Hardhat — alternate chain ID
  31337: {
    contractAddress: process.env.NEXT_PUBLIC_LOCALHOST_CONTRACT_ADDRESS,
    adminAddress: process.env.NEXT_PUBLIC_LOCALHOST_ADMIN_ADDRESS,
    name: "Localhost",
    isLocalhost: true,
    blockExplorer: null,
  },
};

// ── Boot-time fallback ───────────────────────────────────────────────────────
const BOOT_NETWORK = process.env.NEXT_PUBLIC_NETWORK || "sepolia";
const IS_BOOT_LOCAL = BOOT_NETWORK === "localhost";

const FALLBACK_CONFIG = {
  contractAddress: IS_BOOT_LOCAL
    ? process.env.NEXT_PUBLIC_LOCALHOST_CONTRACT_ADDRESS
    : process.env.NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS,
  adminAddress: IS_BOOT_LOCAL
    ? process.env.NEXT_PUBLIC_LOCALHOST_ADMIN_ADDRESS
    : process.env.NEXT_PUBLIC_SEPOLIA_ADMIN_ADDRESS,
  name: IS_BOOT_LOCAL ? "Localhost" : "Sepolia",
  isLocalhost: IS_BOOT_LOCAL,
  blockExplorer: IS_BOOT_LOCAL ? null : "https://sepolia.etherscan.io",
};

/**
 * useNetworkContracts()
 *
 * Returns the unified contract address and network metadata for whichever
 * chain MetaMask is currently connected to. Re-renders automatically on chain
 * switch — no page refresh needed.
 *
 * @returns {{
 *   contractAddress: string,
 *   adminAddress:    string,
 *   name:            string,
 *   isLocalhost:     boolean,
 *   blockExplorer:   string | null,
 *   chainId:         number | undefined,
 *   isSupported:     boolean,
 * }}
 */
export function useNetworkContracts() {
  const { chain } = useNetwork();
  const chainId = chain?.id;
  const config = (chainId && CHAIN_CONFIGS[chainId]) || FALLBACK_CONFIG;

  return {
    ...config,
    chainId,
    isSupported: Boolean(chainId && CHAIN_CONFIGS[chainId] && config.contractAddress),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Boot-time static exports (use inside React hooks via useNetworkContracts)
// ─────────────────────────────────────────────────────────────────────────────

const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "localhost";
const IS_LOCALHOST = NETWORK === "localhost";

/**
 * @deprecated Use `useNetworkContracts().contractAddress` in React components.
 */
export const CONTRACT_ADDRESS = IS_LOCALHOST
  ? process.env.NEXT_PUBLIC_LOCALHOST_CONTRACT_ADDRESS
  : process.env.NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS;

/**
 * @deprecated MILESTONE_MANAGER_ADDRESS is removed — there is only one contract.
 *             This alias prevents hard crashes on import sites not yet updated.
 *             Remove it once all usages are cleaned up.
 */
export const MILESTONE_MANAGER_ADDRESS = CONTRACT_ADDRESS;

/**
 * @deprecated Use `useNetworkContracts().adminAddress`.
 */
export const ADMIN_ADDRESS = IS_LOCALHOST
  ? process.env.NEXT_PUBLIC_LOCALHOST_ADMIN_ADDRESS
  : process.env.NEXT_PUBLIC_SEPOLIA_ADMIN_ADDRESS;

export const ACTIVE_NETWORK = {
  name: IS_LOCALHOST ? "Localhost" : "Sepolia",
  chainId: IS_LOCALHOST
    ? parseInt(process.env.NEXT_PUBLIC_LOCALHOST_CHAIN_ID) || 1337
    : parseInt(process.env.NEXT_PUBLIC_SEPOLIA_CHAIN_ID) || 11155111,
  rpcUrl: IS_LOCALHOST
    ? process.env.NEXT_PUBLIC_LOCALHOST_RPC_URL || "http://127.0.0.1:8545"
    : process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
  blockExplorer: IS_LOCALHOST ? null : "https://sepolia.etherscan.io",
  isLocalhost: IS_LOCALHOST,
};

// ─────────────────────────────────────────────────────────────────────────────
// Re-export shared constants (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
export const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;
export const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
export const PINATA_CONFIG = { pinataApiKey: PINATA_API_KEY, pinataSecretApiKey: PINATA_SECRET_KEY, pinataJWT: PINATA_JWT };

export const CAMPAIGN_CREATION_FEE = "100000000000000"; // 0.0001 ETH in wei

export const STATUS_LABELS = ["Pending", "Submitted", "Approved", "Rejected", "Released", "Refunded"];

export const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "FiHome", path: "/dashboard" },
  { id: "campaigns", label: "All Campaigns", icon: "FiGrid", path: "/campaigns" },
  { id: "create", label: "Create Campaign", icon: "FiPlus", path: "/create-campaign" },
  { id: "my-campaigns", label: "My Campaigns", icon: "FiUser", path: "/my-campaigns" },
  { id: "contributions", label: "My Contributions", icon: "FiHeart", path: "/contributions" },
  { id: "transparency", label: "Transparency", icon: "FiSearch", path: "/transparency" },
  { id: "admin", label: "Admin Panel", icon: "FiSettings", path: "/admin", adminOnly: true },
];

// Dev warnings
if (typeof window !== "undefined") {
  if (!CONTRACT_ADDRESS)
    console.error(`[${NETWORK}] CONTRACT_ADDRESS is not set`);
  if (!PINATA_JWT && !PINATA_API_KEY)
    console.warn("Pinata IPFS credentials not set — uploads will fail");
}
