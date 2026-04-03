/**
 * components/Debug/ContractDebug.js
 *
 * FROZEN ADDRESS FIX:
 *   Was importing CONTRACT_ADDRESS from constants — frozen at boot.
 *   Now uses useNetworkContracts() so the debug panel shows the live
 *   address for whichever chain MetaMask is connected to.
 */

import { useAccount } from "wagmi";
import { useNetworkContracts } from "../../hooks/useNetworkContracts";
import { CROWDFUNDING_ABI } from "../../constants/abi";

export default function ContractDebug() {
  const { address, isConnected, chain } = useAccount();
  const {
    contractAddress: CONTRACT_ADDRESS,
    milestoneAddress: MILESTONE_ADDRESS,
    name: networkName,
    isSupported,
  } = useNetworkContracts();

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm font-mono">
      <h3 className="font-bold mb-2">🔍 Debug Information</h3>
      <div className="space-y-1">
        <div>
          <span className="font-semibold">Wallet Connected:</span>{" "}
          {isConnected ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <span className="font-semibold">Wallet Address:</span>{" "}
          {address || "Not connected"}
        </div>
        <div>
          <span className="font-semibold">Chain ID:</span>{" "}
          {chain?.id || "Unknown"}
        </div>
        <div>
          <span className="font-semibold">Chain Name:</span>{" "}
          {networkName || chain?.name || "Unknown"}
        </div>
        <div>
          <span className="font-semibold">Network Supported:</span>{" "}
          {isSupported ? "✅ Yes" : "⚠️ No — check .env.local"}
        </div>
        <div>
          <span className="font-semibold">Contract Address:</span>{" "}
          {CONTRACT_ADDRESS || "❌ Not set"}
        </div>
        <div>
          <span className="font-semibold">Milestone Address:</span>{" "}
          {MILESTONE_ADDRESS || "❌ Not set"}
        </div>
        <div>
          <span className="font-semibold">ABI Functions Count:</span>{" "}
          {CROWDFUNDING_ABI?.length || 0}
        </div>
        <div>
          <span className="font-semibold">Has createCampaign:</span>{" "}
          {CROWDFUNDING_ABI?.find((i) => i.name === "createCampaign") ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <span className="font-semibold">NEXT_PUBLIC_NETWORK:</span>{" "}
          {process.env.NEXT_PUBLIC_NETWORK || "Not set (defaulting to sepolia)"}
        </div>
      </div>

      {!CONTRACT_ADDRESS && (
        <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-800 dark:text-red-200">
          ⚠️ CONTRACT_ADDRESS is not set for chain {chain?.id} in your .env.local file!
        </div>
      )}

      {!isConnected && (
        <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded text-yellow-800 dark:text-yellow-200">
          ⚠️ Please connect your wallet to interact with the contract.
        </div>
      )}
    </div>
  );
}