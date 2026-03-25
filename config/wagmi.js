// config/wagmi.js
// Fixed: build-time safe — never passes undefined into providers,
// always registers sepolia so chain 11155111 is always known to wagmi.

import { getDefaultWallets, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { configureChains, createConfig } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "";

// ─── Read env values with safe fallbacks ─────────────────────────────────────
// These are evaluated at BUILD TIME on Vercel — every value must have a fallback
// so the build never receives undefined.
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "sepolia";
const IS_LOCALHOST = NETWORK === "localhost";

const ALCHEMY_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const LOCAL_RPC = process.env.NEXT_PUBLIC_LOCALHOST_RPC_URL || "http://127.0.0.1:8545";
const LOCAL_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_LOCALHOST_CHAIN_ID || "1337", 10);

// ─── Chain definitions ───────────────────────────────────────────────────────
const sepoliaChain = {
  ...sepolia, // id: 11155111 — wagmi already knows this chain
  rpcUrls: {
    default: { http: [ALCHEMY_RPC] },
    public: { http: [ALCHEMY_RPC] },
  },
};

const localhostChain = {
  ...hardhat,
  id: LOCAL_CHAIN_ID,
  rpcUrls: {
    default: { http: [LOCAL_RPC] },
    public: { http: [LOCAL_RPC] },
  },
};

// Always include BOTH chains so wagmi never throws
// "No providers configured for chain 11155111" even on localhost mode.
// The first chain in the array is the "default" — active chain goes first.
const chains = IS_LOCALHOST
  ? [localhostChain, sepoliaChain]
  : [sepoliaChain, localhostChain];

// ─── Providers ───────────────────────────────────────────────────────────────
// jsonRpcProvider handles the primary RPC; publicProvider is the fallback.
// Both are always registered so every chain in the array has a working provider.
const { chains: configuredChains, publicClient, webSocketPublicClient } =
  configureChains(chains, [
    jsonRpcProvider({
      rpc: (chain) => {
        if (chain.id === 11155111) return { http: ALCHEMY_RPC };
        if (chain.id === LOCAL_CHAIN_ID) return { http: LOCAL_RPC };
        return null; // let publicProvider handle anything else
      },
    }),
    publicProvider(),
  ]);

// ─── Wallets ─────────────────────────────────────────────────────────────────
const { wallets } = getDefaultWallets({
  appName: process.env.NEXT_PUBLIC_PLATFORM_NAME || "CrowdFund Pro",
  projectId: PROJECT_ID,
  chains: configuredChains,
});

const connectors = connectorsForWallets(wallets);

// ─── Final config ─────────────────────────────────────────────────────────────
export const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export { configuredChains as chains };