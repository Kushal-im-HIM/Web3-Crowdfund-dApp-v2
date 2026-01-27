import {
  getDefaultWallets,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import { configureChains, createConfig } from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID);
const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME;
const CHAIN_SYMBOL = process.env.NEXT_PUBLIC_CHAIN_SYMBOL;
const BLOCK_EXPLORER = process.env.NEXT_PUBLIC_BLOCK_EXPLORER;
const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK;
const BLOCK_EXPLORER_NAME = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_NAME;

// Define your custom chain
const customChain = {
  id: CHAIN_ID,
  name: CHAIN_NAME,
  network: NETWORK_NAME,
  nativeCurrency: {
    name: CHAIN_SYMBOL,
    symbol: CHAIN_SYMBOL,
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
    public: {
      http: [RPC_URL],
    },
  },
  blockExplorers: BLOCK_EXPLORER
    ? {
        default: {
          name: BLOCK_EXPLORER_NAME,
          url: BLOCK_EXPLORER,
        },
      }
    : undefined,
  testnet: NETWORK_NAME !== "mainnet",
};

// Configure chains and providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [customChain],
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: RPC_URL,
      }),
    }),
    publicProvider(),
  ]
);

// Configure wallets
const { wallets } = getDefaultWallets({
  appName: process.env.NEXT_PUBLIC_PLATFORM_NAME,
  projectId: PROJECT_ID,
  chains,
});

const connectors = connectorsForWallets(wallets);

// Create wagmi config
export const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export { chains };
