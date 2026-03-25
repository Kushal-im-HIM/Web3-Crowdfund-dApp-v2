import { getDefaultWallets, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { configureChains, createConfig } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";
import { ACTIVE_NETWORK } from "../constants";

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

// ─── Pick the right chain object ─────────────────────────────────────────
// wagmi ships `hardhat` (chainId 31337) and `sepolia` (chainId 11155111) built-in.
// For localhost we use the built-in `hardhat` chain so MetaMask auto-recognises it.
const localhostChain = {
  ...hardhat,
  id: ACTIVE_NETWORK.chainId, // respect .env CHAIN_ID (may be 1337)
  rpcUrls: {
    default: { http: [ACTIVE_NETWORK.rpcUrl || "http://127.0.0.1:8545"] },
    public: { http: [ACTIVE_NETWORK.rpcUrl || "http://127.0.0.1:8545"] },
  },
};

const sepoliaChain = {
  ...sepolia,
  rpcUrls: {
    default: { http: [ACTIVE_NETWORK.rpcUrl || "https://rpc.sepolia.org"] },
    public: { http: [ACTIVE_NETWORK.rpcUrl || "https://rpc.sepolia.org"] },
  },
};

const activeChain = ACTIVE_NETWORK.isLocalhost ? localhostChain : sepoliaChain;

// ─── Providers ───────────────────────────────────────────────────────────
const providers = ACTIVE_NETWORK.isLocalhost
  ? [
    // Localhost: only use the local RPC — no public fallback needed
    jsonRpcProvider({ rpc: () => ({ http: ACTIVE_NETWORK.rpcUrl || "http://127.0.0.1:8545" }) }),
  ]
  : [
    // Sepolia: use Alchemy RPC + public fallback
    jsonRpcProvider({ rpc: () => ({ http: ACTIVE_NETWORK.rpcUrl }) }),
    publicProvider(),
  ];

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [activeChain],
  providers
);

// ─── Wallets ─────────────────────────────────────────────────────────────
const { wallets } = getDefaultWallets({
  appName: process.env.NEXT_PUBLIC_PLATFORM_NAME || "CrowdFund Pro",
  projectId: PROJECT_ID,
  chains,
});

const connectors = connectorsForWallets(wallets);

// ─── Export ──────────────────────────────────────────────────────────────
export const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export { chains };
