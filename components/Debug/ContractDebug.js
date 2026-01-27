import { useAccount } from "wagmi";
import { CONTRACT_ADDRESS } from "../../constants";
import { CROWDFUNDING_ABI } from "../../constants/abi";

export default function ContractDebug() {
  const { address, isConnected, chain } = useAccount();

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
          {chain?.name || "Unknown"}
        </div>

        <div>
          <span className="font-semibold">Contract Address:</span>{" "}
          {CONTRACT_ADDRESS || "❌ Not set"}
        </div>

        <div>
          <span className="font-semibold">ABI Functions Count:</span>{" "}
          {CROWDFUNDING_ABI?.length || 0}
        </div>

        <div>
          <span className="font-semibold">Has createCampaign:</span>{" "}
          {CROWDFUNDING_ABI?.find((item) => item.name === "createCampaign")
            ? "✅ Yes"
            : "❌ No"}
        </div>

        <div>
          <span className="font-semibold">RPC URL:</span>{" "}
          {process.env.NEXT_PUBLIC_RPC_URL || "Not set"}
        </div>

        <div>
          <span className="font-semibold">Network:</span>{" "}
          {process.env.NEXT_PUBLIC_NETWORK || "Not set"}
        </div>
      </div>

      {!CONTRACT_ADDRESS && (
        <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-800 dark:text-red-200">
          ⚠️ CONTRACT_ADDRESS is not set in your .env.local file!
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
