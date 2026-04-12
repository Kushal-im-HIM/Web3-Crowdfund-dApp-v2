// config/wagmi.js
import { getDefaultWallets, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { configureChains, createConfig } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "";

const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "sepolia";
const IS_LOCALHOST = NETWORK === "localhost";

const ALCHEMY_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const LOCAL_RPC = process.env.NEXT_PUBLIC_LOCALHOST_RPC_URL || "http://127.0.0.1:8545";
const LOCAL_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_LOCALHOST_CHAIN_ID || "1337", 10);

const sepoliaChain = {
  ...sepolia,
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

const chains = IS_LOCALHOST
  ? [localhostChain, sepoliaChain]
  : [sepoliaChain, localhostChain];

const { chains: configuredChains, publicClient, webSocketPublicClient } =
  configureChains(chains, [
    jsonRpcProvider({
      rpc: (chain) => {
        if (chain.id === 11155111) return { http: ALCHEMY_RPC };
        if (chain.id === LOCAL_CHAIN_ID) return { http: LOCAL_RPC };
        return null;
      },
    }),
    publicProvider(),
  ]);

// Issue 4 — renamed to EthosFund
const { wallets } = getDefaultWallets({
  appName: process.env.NEXT_PUBLIC_PLATFORM_NAME || "EthosFund",
  projectId: PROJECT_ID,
  chains: configuredChains,
});

const connectors = connectorsForWallets(wallets);

export const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export { configuredChains as chains };
