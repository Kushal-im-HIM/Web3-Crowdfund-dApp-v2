/**
 * hooks/useNetworkContracts.js
 *
 * ROOT CAUSE FIX — Runtime Network Resolution
 *
 * THE BUG (pre-existing, not introduced by recent changes):
 *   constants/index.js and wagmi.js both read NEXT_PUBLIC_NETWORK at build/boot
 *   time. Switching MetaMask between Hardhat ↔ Sepolia at runtime never updates
 *   CONTRACT_ADDRESS, MILESTONE_MANAGER_ADDRESS, ADMIN_ADDRESS, or the header
 *   network badge — they stay frozen at whatever network was active when `next dev`
 *   started. This explains:
 *     • "No campaigns found" (Hardhat chain ID but Sepolia contract address)
 *     • Admin panel invisible (ADMIN_ADDRESS from wrong chain)
 *     • Network badge stuck on "LOCALHOST" even after switching to Sepolia
 *
 * THE FIX:
 *   This hook reads the LIVE chain.id from wagmi's useNetwork() and returns the
 *   correct set of addresses + metadata for whichever network MetaMask is actually
 *   connected to — no server restart, no env var changes required.
 *
 * CHAIN ID MAP:
 *   11155111 → Sepolia
 *   1337     → Hardhat (default chainId)
 *   31337    → Hardhat (alternate chainId used by some hardhat.config.js setups)
 */

import { useNetwork } from "wagmi";

// ── Chain configuration map ──────────────────────────────────────────────────
// All values read from env vars at runtime (Next.js exposes NEXT_PUBLIC_* vars
// to the browser bundle, so they are available client-side at any time).
const CHAIN_CONFIGS = {
  // Sepolia testnet
  11155111: {
    contractAddress: process.env.NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS,
    milestoneAddress: process.env.NEXT_PUBLIC_SEPOLIA_MILESTONE_ADDRESS,
    adminAddress: process.env.NEXT_PUBLIC_SEPOLIA_ADMIN_ADDRESS,
    name: "Sepolia",
    isLocalhost: false,
    blockExplorer: "https://sepolia.etherscan.io",
  },
  // Hardhat — default chain ID
  1337: {
    contractAddress: process.env.NEXT_PUBLIC_LOCALHOST_CONTRACT_ADDRESS,
    milestoneAddress: process.env.NEXT_PUBLIC_LOCALHOST_MILESTONE_ADDRESS,
    adminAddress: process.env.NEXT_PUBLIC_LOCALHOST_ADMIN_ADDRESS,
    name: "Localhost",
    isLocalhost: true,
    blockExplorer: null,
  },
  // Hardhat — alternate chain ID (used by some hardhat.config.js setups)
  31337: {
    contractAddress: process.env.NEXT_PUBLIC_LOCALHOST_CONTRACT_ADDRESS,
    milestoneAddress: process.env.NEXT_PUBLIC_LOCALHOST_MILESTONE_ADDRESS,
    adminAddress: process.env.NEXT_PUBLIC_LOCALHOST_ADMIN_ADDRESS,
    name: "Localhost",
    isLocalhost: true,
    blockExplorer: null,
  },
};

// ── Fallback: matches whatever NEXT_PUBLIC_NETWORK is set to at startup ───────
// This ensures the app doesn't crash if the user connects to an unexpected chain.
const BOOT_NETWORK = process.env.NEXT_PUBLIC_NETWORK || "sepolia";
const IS_BOOT_LOCALHOST = BOOT_NETWORK === "localhost";

const FALLBACK_CONFIG = {
  contractAddress: IS_BOOT_LOCALHOST
    ? process.env.NEXT_PUBLIC_LOCALHOST_CONTRACT_ADDRESS
    : process.env.NEXT_PUBLIC_SEPOLIA_CONTRACT_ADDRESS,
  milestoneAddress: IS_BOOT_LOCALHOST
    ? process.env.NEXT_PUBLIC_LOCALHOST_MILESTONE_ADDRESS
    : process.env.NEXT_PUBLIC_SEPOLIA_MILESTONE_ADDRESS,
  adminAddress: IS_BOOT_LOCALHOST
    ? process.env.NEXT_PUBLIC_LOCALHOST_ADMIN_ADDRESS
    : process.env.NEXT_PUBLIC_SEPOLIA_ADMIN_ADDRESS,
  name: IS_BOOT_LOCALHOST ? "Localhost" : "Sepolia",
  isLocalhost: IS_BOOT_LOCALHOST,
  blockExplorer: IS_BOOT_LOCALHOST ? null : "https://sepolia.etherscan.io",
};

/**
 * useNetworkContracts()
 *
 * Returns the correct contract addresses and network metadata for the chain
 * MetaMask is CURRENTLY connected to. Re-renders automatically when the user
 * switches chains in MetaMask — no page refresh needed.
 *
 * @returns {{
 *   contractAddress: string,
 *   milestoneAddress: string,
 *   adminAddress: string,
 *   name: string,
 *   isLocalhost: boolean,
 *   blockExplorer: string | null,
 *   chainId: number | undefined,
 *   isSupported: boolean,
 * }}
 */
export function useNetworkContracts() {
  const { chain } = useNetwork();
  const chainId = chain?.id;

  const config = (chainId && CHAIN_CONFIGS[chainId]) || FALLBACK_CONFIG;

  return {
    ...config,
    chainId,
    // isSupported: true when we recognise the chain and have contract addresses
    isSupported: Boolean(chainId && CHAIN_CONFIGS[chainId] && config.contractAddress),
  };
}
