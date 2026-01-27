import { useAccount, useContractWrite, useContractRead } from "wagmi";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "../components/Layout/Layout";
import { useContract } from "../hooks/useContract";
import { toast } from "react-hot-toast";
import {
  FiSettings,
  FiPause,
  FiPlay,
  FiDollarSign,
  FiShield,
  FiUsers,
  FiActivity,
  FiAlertTriangle,
} from "react-icons/fi";
import { formatEther, parseEther } from "../utils/helpers";
import { CONTRACT_ADDRESS } from "../constants";
import { CROWDFUNDING_ABI } from "../constants/abi";

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { useContractStats } = useContract();
  const [isAdmin, setIsAdmin] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [campaignToToggle, setCampaignToToggle] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: contractStats } = useContractStats();

  // Check if contract is paused
  const { data: isPaused } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "paused",
    enabled: Boolean(CONTRACT_ADDRESS && isAdmin),
    watch: true,
  });

  // Get contract owner
  const { data: contractOwner } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "owner",
    enabled: Boolean(CONTRACT_ADDRESS),
    watch: true,
  });

  // Admin write functions
  const { write: withdrawFees, isLoading: isWithdrawing } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "withdrawFees",
    onSuccess: () => {
      toast.success("Fees withdrawn successfully!");
      setWithdrawAmount("");
    },
    onError: (error) => {
      toast.error(error?.reason || "Failed to withdraw fees");
    },
  });

  const { write: pauseContract, isLoading: isPausing } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "pause",
    onSuccess: () => {
      toast.success("Contract paused successfully!");
    },
    onError: (error) => {
      toast.error(error?.reason || "Failed to pause contract");
    },
  });

  const { write: unpauseContract, isLoading: isUnpausing } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "unpause",
    onSuccess: () => {
      toast.success("Contract unpaused successfully!");
    },
    onError: (error) => {
      toast.error(error?.reason || "Failed to unpause contract");
    },
  });

  const { write: emergencyWithdraw, isLoading: isEmergencyWithdrawing } =
    useContractWrite({
      address: CONTRACT_ADDRESS,
      abi: CROWDFUNDING_ABI,
      functionName: "emergencyWithdraw",
      onSuccess: () => {
        toast.success("Emergency withdrawal completed!");
      },
      onError: (error) => {
        toast.error(error?.reason || "Failed to emergency withdraw");
      },
    });

  const { write: deactivateCampaign, isLoading: isDeactivating } =
    useContractWrite({
      address: CONTRACT_ADDRESS,
      abi: CROWDFUNDING_ABI,
      functionName: "deactivateCampaign",
      onSuccess: () => {
        toast.success("Campaign deactivated successfully!");
        setCampaignToToggle("");
      },
      onError: (error) => {
        toast.error(error?.reason || "Failed to deactivate campaign");
      },
    });

  const { write: reactivateCampaign, isLoading: isReactivating } =
    useContractWrite({
      address: CONTRACT_ADDRESS,
      abi: CROWDFUNDING_ABI,
      functionName: "reactivateCampaign",
      onSuccess: () => {
        toast.success("Campaign reactivated successfully!");
        setCampaignToToggle("");
      },
      onError: (error) => {
        toast.error(error?.reason || "Failed to reactivate campaign");
      },
    });

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
      return;
    }

    // Check if user is admin by comparing with contract owner
    if (contractOwner && address) {
      const userIsAdmin = address.toLowerCase() === contractOwner.toLowerCase();
      setIsAdmin(userIsAdmin);

      if (!userIsAdmin) {
        toast.error("Access denied: Admin privileges required");
        router.push("/dashboard");
      }
    }
  }, [isConnected, address, router, contractOwner]);

  if (!isConnected || !isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <FiShield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Restricted
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              This area is restricted to administrators only.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleWithdrawFees = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const amountInWei = parseEther(withdrawAmount);
      withdrawFees?.({ args: [amountInWei] });
    } catch (error) {
      toast.error("Invalid amount format");
    }
  };

  const handlePauseContract = () => {
    if (isPaused) {
      unpauseContract?.();
    } else {
      pauseContract?.();
    }
  };

  const handleEmergencyWithdraw = () => {
    if (
      window.confirm(
        "Are you sure you want to perform an emergency withdrawal? This action cannot be undone."
      )
    ) {
      emergencyWithdraw?.();
    }
  };

  const handleToggleCampaign = () => {
    if (!campaignToToggle || parseInt(campaignToToggle) <= 0) {
      toast.error("Please enter a valid campaign ID");
      return;
    }

    const campaignId = parseInt(campaignToToggle);

    if (
      window.confirm(`Are you sure you want to toggle campaign #${campaignId}?`)
    ) {
      // For simplicity, we'll deactivate. In a full implementation,
      // you'd check the campaign status first
      deactivateCampaign?.({ args: [campaignId] });
    }
  };

  // Handle contractStats - now returns processed object
  const availableFees = contractStats?.totalFees
    ? formatEther(contractStats.totalFees)
    : "0";
  const contractBalance = contractStats?.contractBalance
    ? formatEther(contractStats.contractBalance)
    : "0";
  const totalCampaigns = contractStats?.totalCampaigns
    ? contractStats.totalCampaigns.toString()
    : "0";

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Admin Panel
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage platform settings and monitor system health
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isPaused ? "bg-red-500" : "bg-green-500"
              }`}
            ></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isPaused ? "Paused" : "Active"}
            </span>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Total Campaigns
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalCampaigns}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FiActivity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Platform Fees
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {availableFees} ETH
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Contract Balance
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {contractBalance} ETH
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <FiShield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Platform Status
                </p>
                <p
                  className={`text-2xl font-bold ${
                    isPaused
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {isPaused ? "Paused" : "Active"}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isPaused
                    ? "bg-red-100 dark:bg-red-900"
                    : "bg-green-100 dark:bg-green-900"
                }`}
              >
                {isPaused ? (
                  <FiPause className="w-6 h-6 text-red-600 dark:text-red-400" />
                ) : (
                  <FiPlay className="w-6 h-6 text-green-600 dark:text-green-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Fee Management */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Fee Management
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Withdraw Amount (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={availableFees}
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {availableFees} ETH
                </p>
              </div>
              <button
                onClick={handleWithdrawFees}
                disabled={isWithdrawing || !withdrawAmount}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw Fees"}
              </button>
            </div>
          </div>

          {/* Platform Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Platform Controls
            </h3>
            <div className="space-y-4">
              <button
                onClick={handlePauseContract}
                disabled={isPausing || isUnpausing}
                className={`w-full font-medium py-3 rounded-lg transition-colors inline-flex items-center justify-center ${
                  isPaused
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-yellow-500 hover:bg-yellow-600 text-white"
                }`}
              >
                {isPausing || isUnpausing ? (
                  "Processing..."
                ) : isPaused ? (
                  <>
                    <FiPlay className="w-5 h-5 mr-2" />
                    Resume Contract
                  </>
                ) : (
                  <>
                    <FiPause className="w-5 h-5 mr-2" />
                    Pause Contract
                  </>
                )}
              </button>

              <button
                onClick={handleEmergencyWithdraw}
                disabled={isEmergencyWithdrawing}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors inline-flex items-center justify-center"
              >
                <FiAlertTriangle className="w-5 h-5 mr-2" />
                {isEmergencyWithdrawing
                  ? "Processing..."
                  : "Emergency Withdraw"}
              </button>
            </div>
          </div>

          {/* Campaign Management */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Campaign Management
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Campaign ID
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter campaign ID"
                  value={campaignToToggle}
                  onChange={(e) => setCampaignToToggle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                onClick={handleToggleCampaign}
                disabled={isDeactivating || isReactivating || !campaignToToggle}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isDeactivating || isReactivating
                  ? "Processing..."
                  : "Deactivate Campaign"}
              </button>
            </div>
          </div>
        </div>

        {/* Contract Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Contract Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Contract Address:
              </span>
              <div className="font-mono text-gray-900 dark:text-white break-all">
                {CONTRACT_ADDRESS}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Owner Address:
              </span>
              <div className="font-mono text-gray-900 dark:text-white break-all">
                {contractOwner || "Loading..."}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                Creation Fee:
              </span>
              <div className="text-gray-900 dark:text-white">1.0 ETH</div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <div
                className={`font-medium ${
                  isPaused ? "text-red-600" : "text-green-600"
                }`}
              >
                {isPaused ? "Contract Paused" : "Contract Active"}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities - Static for now */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isPaused ? "bg-red-500" : "bg-green-500"
                  }`}
                ></div>
                <span className="text-gray-900 dark:text-white">
                  Contract {isPaused ? "paused" : "operational"}
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Current status
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-900 dark:text-white">
                  {totalCampaigns} total campaigns
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                All time
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-900 dark:text-white">
                  {availableFees} ETH in platform fees
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Available to withdraw
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
