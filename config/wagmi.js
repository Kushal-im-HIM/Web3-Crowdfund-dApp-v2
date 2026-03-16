import {
  getDefaultWallets,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import { configureChains, createConfig } from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";

// 1. Pull dynamic values from .env.local
const PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID) || 1337;
const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || "Localhost";
const CHAIN_SYMBOL = process.env.NEXT_PUBLIC_CHAIN_SYMBOL || "ETH";
const BLOCK_EXPLORER = process.env.NEXT_PUBLIC_BLOCK_EXPLORER;

// 2. Define the chain dynamically
const activeChain = {
  id: CHAIN_ID,
  name: CHAIN_NAME,
  network: process.env.NEXT_PUBLIC_NETWORK || "localhost",
  nativeCurrency: {
    name: CHAIN_SYMBOL,
    symbol: CHAIN_SYMBOL,
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: BLOCK_EXPLORER
    ? {
      default: {
        name: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_NAME || "Explorer",
        url: BLOCK_EXPLORER,
      },
    }
    : undefined,
  testnet: true,
};

// 3. Configure Chains
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [activeChain], // This now follows your .env.local settings
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: RPC_URL,
      }),
    }),
  ]
);

// 4. Configure Wallets
const { wallets } = getDefaultWallets({
  appName: process.env.NEXT_PUBLIC_PLATFORM_NAME || "CrowdFund Pro",
  projectId: PROJECT_ID,
  chains,
});

const connectors = connectorsForWallets(wallets);

// 5. Export Config
export const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export { chains };