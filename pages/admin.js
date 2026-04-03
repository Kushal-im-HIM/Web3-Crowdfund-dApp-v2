/**
 * pages/admin.js
 *
 * ERROR 5 FIX — Admin Panel "Access Restricted"
 *
 * ROOT CAUSE:
 *   Every useContractRead and useContractWrite was using CONTRACT_ADDRESS
 *   imported from constants/index.js — a value baked from NEXT_PUBLIC_NETWORK
 *   at boot time. When you're connected to Sepolia but the server started on
 *   Hardhat (or vice versa), CONTRACT_ADDRESS points to the WRONG chain.
 *
 *   The `owner()` call then either:
 *     a) hits the wrong address and returns 0x0000… (no match), or
 *     b) fails entirely (0x revert) so contractOwner stays undefined
 *
 *   The guard `if (!isConnected || !isAdmin)` fires before contractOwner
 *   resolves, immediately showing "Access Restricted". Even after it resolves,
 *   `userIsAdmin` is false because the returned owner is from the wrong network.
 *
 * THE FIX:
 *   1. Replace the static CONTRACT_ADDRESS import with useNetworkContracts()
 *      so all reads/writes target the live chain's contract.
 *   2. Add an `isVerifying` loading state so the page shows a spinner while
 *      `contractOwner` is still being fetched — preventing the premature
 *      "Access Restricted" flash before the RPC call completes.
 *   3. Keep the useEffect dependency array accurate ([contractOwner, address]).
 */

import { useAccount, useContractWrite, useContractRead } from "wagmi";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "../components/Layout/Layout";
import { useContract } from "../hooks/useContract";
import { useNetworkContracts } from "../hooks/useNetworkContracts";
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
import { CROWDFUNDING_ABI } from "../constants/abi";

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { useContractStats } = useContract();

  // ERROR 5 FIX: live contract address for the currently connected chain
  const { contractAddress: CONTRACT_ADDRESS } = useNetworkContracts();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true); // prevents premature "Access Restricted"
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [campaignToToggle, setCampaignToToggle] = useState("");

  const { data: contractStats } = useContractStats();

  // All reads now use the live CONTRACT_ADDRESS from useNetworkContracts()
  const { data: isPaused } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "paused",
    enabled: Boolean(CONTRACT_ADDRESS && isAdmin),
    watch: true,
  });

  const { data: contractOwner, isLoading: ownerLoading } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "owner",
    enabled: Boolean(CONTRACT_ADDRESS),
    watch: true,
  });

  // All writes now use the live CONTRACT_ADDRESS
  const { write: withdrawFees, isLoading: isWithdrawing } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "withdrawFees",
    onSuccess: () => { toast.success("Fees withdrawn successfully!"); setWithdrawAmount(""); },
    onError: (error) => { toast.error(error?.reason || "Failed to withdraw fees"); },
  });

  const { write: pauseContract, isLoading: isPausing } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "pause",
    onSuccess: () => { toast.success("Contract paused successfully!"); },
    onError: (error) => { toast.error(error?.reason || "Failed to pause contract"); },
  });

  const { write: unpauseContract, isLoading: isUnpausing } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "unpause",
    onSuccess: () => { toast.success("Contract unpaused successfully!"); },
    onError: (error) => { toast.error(error?.reason || "Failed to unpause contract"); },
  });

  const { write: emergencyWithdraw, isLoading: isEmergencyWithdrawing } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "emergencyWithdraw",
    onSuccess: () => { toast.success("Emergency withdrawal completed!"); },
    onError: (error) => { toast.error(error?.reason || "Failed to emergency withdraw"); },
  });

  const { write: deactivateCampaign, isLoading: isDeactivating } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "deactivateCampaign",
    onSuccess: () => { toast.success("Campaign deactivated successfully!"); setCampaignToToggle(""); },
    onError: (error) => { toast.error(error?.reason || "Failed to deactivate campaign"); },
  });

  const { write: reactivateCampaign, isLoading: isReactivating } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "reactivateCampaign",
    onSuccess: () => { toast.success("Campaign reactivated successfully!"); setCampaignToToggle(""); },
    onError: (error) => { toast.error(error?.reason || "Failed to reactivate campaign"); },
  });

  // ERROR 5 FIX: gate on ownerLoading so we don't flash "Access Restricted"
  // while the RPC call to owner() is still in flight
  useEffect(() => {
    if (!isConnected) {
      router.push("/");
      return;
    }

    // Still waiting for the owner() RPC call — keep showing spinner
    if (ownerLoading || !CONTRACT_ADDRESS) {
      setIsVerifying(true);
      return;
    }

    // contractOwner resolved — now we can compare
    if (contractOwner && address) {
      const userIsAdmin = address.toLowerCase() === contractOwner.toLowerCase();
      setIsAdmin(userIsAdmin);
      setIsVerifying(false);

      if (!userIsAdmin) {
        toast.error("Access denied: Admin privileges required");
        router.push("/dashboard");
      }
    } else if (!contractOwner && !ownerLoading) {
      // owner() returned nothing — contract address is probably wrong for this chain
      setIsVerifying(false);
      setIsAdmin(false);
    }
  }, [isConnected, address, router, contractOwner, ownerLoading, CONTRACT_ADDRESS]);

  // ── Loading / verifying state ──────────────────────────────────────────────
  if (!isConnected || (isVerifying && ownerLoading)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary-500 mx-auto" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Verifying admin credentials…
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Access denied (owner loaded but doesn't match) ────────────────────────
  if (!isAdmin) {
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
            {contractOwner && (
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-3 font-mono">
                Contract owner: {contractOwner}
              </p>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleWithdrawFees = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      withdrawFees?.({ args: [parseEther(withdrawAmount)] });
    } catch {
      toast.error("Invalid amount format");
    }
  };

  const handlePauseContract = () => {
    isPaused ? unpauseContract?.() : pauseContract?.();
  };

  const handleEmergencyWithdraw = () => {
    if (window.confirm("Are you sure you want to perform an emergency withdrawal? This action cannot be undone.")) {
      emergencyWithdraw?.();
    }
  };

  const handleToggleCampaign = () => {
    if (!campaignToToggle || parseInt(campaignToToggle) <= 0) {
      toast.error("Please enter a valid campaign ID");
      return;
    }
    const campaignId = parseInt(campaignToToggle);
    if (window.confirm(`Are you sure you want to toggle campaign #${campaignId}?`)) {
      deactivateCampaign?.({ args: [campaignId] });
    }
  };

  const availableFees = contractStats?.totalFees ? formatEther(contractStats.totalFees) : "0";
  const contractBalance = contractStats?.contractBalance ? formatEther(contractStats.contractBalance) : "0";
  const totalCampaigns = contractStats?.totalCampaigns ? contractStats.totalCampaigns.toString() : "0";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Panel</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage platform settings and monitor system health
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isPaused ? "bg-red-500" : "bg-emerald-500"}`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isPaused ? "Paused" : "Active"}
            </span>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Total Campaigns", value: totalCampaigns, icon: FiActivity, color: "secondary" },
            { label: "Platform Fees", value: `${availableFees} ETH`, icon: FiDollarSign, color: "tertiary" },
            { label: "Contract Balance", value: `${contractBalance} ETH`, icon: FiShield, color: "accent" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-100 dark:border-primary-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
                <div className={`w-12 h-12 bg-${color}-50 dark:bg-${color}-900/20 rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
                </div>
              </div>
            </div>
          ))}

          {/* Platform Status card */}
          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-100 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Platform Status</p>
                <p className={`text-2xl font-bold ${isPaused ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {isPaused ? "Paused" : "Active"}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isPaused ? "bg-red-50 dark:bg-red-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"}`}>
                {isPaused
                  ? <FiPause className="w-6 h-6 text-red-600 dark:text-red-400" />
                  : <FiPlay className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                }
              </div>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Fee Management */}
          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-100 dark:border-primary-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fee Management</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Withdraw Amount (ETH)
                </label>
                <input
                  type="number" step="0.01" min="0" max={availableFees}
                  placeholder="0.00" value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 dark:bg-primary-700 dark:text-white outline-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Available: {availableFees} ETH</p>
              </div>
              <button
                onClick={handleWithdrawFees}
                disabled={isWithdrawing || !withdrawAmount}
                className="w-full bg-gradient-emerald hover:shadow-emerald-glow disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none text-white font-medium py-3 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw Fees"}
              </button>
            </div>
          </div>

          {/* Platform Controls */}
          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-100 dark:border-primary-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Controls</h3>
            <div className="space-y-4">
              <button
                onClick={handlePauseContract}
                disabled={isPausing || isUnpausing}
                className={`w-full font-medium py-3 rounded-lg transition-all duration-300 inline-flex items-center justify-center disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-white ${isPaused
                    ? "bg-gradient-emerald hover:shadow-emerald-glow text-white"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
                  }`}
              >
                {isPausing || isUnpausing ? "Processing..." : isPaused
                  ? <><FiPlay className="w-5 h-5 mr-2" />Resume Contract</>
                  : <><FiPause className="w-5 h-5 mr-2" />Pause Contract</>
                }
              </button>
              <button
                onClick={handleEmergencyWithdraw}
                disabled={isEmergencyWithdrawing}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors inline-flex items-center justify-center disabled:cursor-not-allowed"
              >
                <FiAlertTriangle className="w-5 h-5 mr-2" />
                {isEmergencyWithdrawing ? "Processing..." : "Emergency Withdraw"}
              </button>
            </div>
          </div>

          {/* Campaign Management */}
          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-100 dark:border-primary-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Management</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Campaign ID
                </label>
                <input
                  type="number" min="1" placeholder="Enter campaign ID"
                  value={campaignToToggle}
                  onChange={(e) => setCampaignToToggle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 dark:bg-primary-700 dark:text-white outline-none"
                />
              </div>
              <button
                onClick={handleToggleCampaign}
                disabled={isDeactivating || isReactivating || !campaignToToggle}
                className="w-full bg-secondary-500 hover:bg-secondary-600 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isDeactivating || isReactivating ? "Processing..." : "Deactivate Campaign"}
              </button>
            </div>
          </div>
        </div>

        {/* Contract Information */}
        <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-100 dark:border-primary-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contract Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Contract Address:</span>
              <div className="font-mono text-gray-900 dark:text-white break-all mt-1">
                {CONTRACT_ADDRESS || "—"}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Owner Address:</span>
              <div className="font-mono text-gray-900 dark:text-white break-all mt-1">
                {contractOwner || "Loading..."}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Creation Fee:</span>
              <div className="text-gray-900 dark:text-white mt-1">0.0001 ETH</div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <div className={`font-medium mt-1 ${isPaused ? "text-red-500" : "text-emerald-500"}`}>
                {isPaused ? "Contract Paused" : "Contract Active"}
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-100 dark:border-primary-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-primary-900/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${isPaused ? "bg-red-500" : "bg-emerald-500"}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Smart Contract</span>
              </div>
              <span className={`text-sm font-semibold ${isPaused ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {isPaused ? "Paused" : "Operational"}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-primary-900/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin Access</span>
              </div>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Verified</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}