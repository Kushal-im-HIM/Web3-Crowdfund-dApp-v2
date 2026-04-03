/**
 * pages/my-campaigns.js
 *
 * ERROR 4 FIX — My Campaigns Page Empty
 *
 * ROOT CAUSE:
 *   `campaignContracts` useMemo was building contract call objects with
 *   CONTRACT_ADDRESS imported from constants/index.js — a value frozen at boot
 *   time from NEXT_PUBLIC_NETWORK. When connected to Sepolia after booting on
 *   Hardhat (or starting the server with the wrong NEXT_PUBLIC_NETWORK), this
 *   address pointed to the wrong network, so getCampaign() returned 0x (empty)
 *   for every ID. The entire campaigns array was filtered to [].
 *
 *   Additionally, the useContractReads call inherited the same stale address,
 *   so even if campaignIds arrived correctly, no data was ever fetched.
 *
 * THE FIX:
 *   1. Remove the static CONTRACT_ADDRESS import.
 *   2. Call useNetworkContracts() to get the live address for the connected chain.
 *   3. Add CONTRACT_ADDRESS to the useMemo dependency array so the contract
 *      calls are rebuilt whenever the user switches networks in MetaMask.
 *   4. Pass the live address directly to useContractReads.
 *
 * No visual changes — only data-fetching logic was updated.
 */

import { useAccount, useContractReads } from "wagmi";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import Layout from "../components/Layout/Layout";
import CampaignCard from "../components/Campaign/CampaignCard";
import { useContract } from "../hooks/useContract";
import { useNetworkContracts } from "../hooks/useNetworkContracts";
import { FiPlus, FiTarget, FiTrendingUp, FiUsers } from "react-icons/fi";
import { formatEther, calculateProgress } from "../utils/helpers";
import { CROWDFUNDING_ABI } from "../constants/abi";

export default function MyCampaignsPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { useUserCampaigns } = useContract();

  // ERROR 4 FIX: live contract address — updates when MetaMask chain changes
  const { contractAddress: CONTRACT_ADDRESS } = useNetworkContracts();

  const [campaigns, setCampaigns] = useState([]);

  const { data: campaignIds, isLoading: loadingIds } = useUserCampaigns(address);

  // ERROR 4 FIX: CONTRACT_ADDRESS added to dependency array so useMemo rebuilds
  // when the user switches chains — previously stale address caused empty results
  const campaignContracts = useMemo(() => {
    if (!campaignIds || campaignIds.length === 0 || !CONTRACT_ADDRESS) return [];

    return campaignIds.map((id) => {
      const numberId = typeof id === "bigint" ? Number(id) : Number(id.toString());
      return {
        address: CONTRACT_ADDRESS,   // ← live address, not the frozen import
        abi: CROWDFUNDING_ABI,
        functionName: "getCampaign",
        args: [numberId],
      };
    });
  }, [campaignIds, CONTRACT_ADDRESS]); // ← CONTRACT_ADDRESS in deps

  const {
    data: campaignsData,
    isLoading: loadingCampaigns,
  } = useContractReads({
    contracts: campaignContracts,
    enabled: campaignContracts.length > 0,
    watch: true,
  });

  const loading = loadingIds || loadingCampaigns;

  useEffect(() => {
    if (campaignsData && campaignIds) {
      const formatted = campaignsData
        .map((result, index) => {
          if (result.status === "success" && result.result) {
            const d = result.result;
            const safeBN = (v) => {
              if (!v) return 0n;
              if (typeof v === "bigint") return v;
              return BigInt(v.toString());
            };
            const safeNum = (v) => {
              if (!v) return 0;
              if (typeof v === "bigint") return Number(v);
              return Number(v.toString());
            };
            return {
              id: safeNum(d.id || campaignIds[index]),
              creator: d.creator,
              title: d.title,
              description: d.description,
              metadataHash: d.metadataHash,
              targetAmount: safeBN(d.targetAmount),
              raisedAmount: safeBN(d.raisedAmount),
              deadline: safeNum(d.deadline),
              withdrawn: d.withdrawn,
              active: d.active,
              createdAt: safeNum(d.createdAt),
              contributorsCount: safeNum(d.contributorsCount),
            };
          }
          return null;
        })
        .filter(Boolean);

      setCampaigns(formatted);
    } else if (campaignIds && campaignIds.length === 0) {
      setCampaigns([]);
    }
  }, [campaignsData, campaignIds]);

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  if (!isConnected) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please connect your wallet to view your campaigns.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalRaised = campaigns.reduce(
    (sum, c) => sum + parseFloat(formatEther(c.raisedAmount || 0)), 0
  );
  const successfulCampaigns = campaigns.filter(
    (c) => calculateProgress(c.raisedAmount, c.targetAmount) >= 100
  ).length;
  const activeCampaigns = campaigns.filter(
    (c) => c.active && new Date(c.deadline * 1000) > new Date()
  ).length;

  return (
    <Layout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Campaigns</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and track your crowdfunding campaigns
            </p>
          </div>
          <button
            onClick={() => router.push("/create-campaign")}
            className="bg-gradient-emerald hover:shadow-emerald-glow text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 inline-flex items-center"
          >
            <FiPlus className="w-5 h-5 mr-2" />
            Create Campaign
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Total Campaigns", value: campaigns.length, icon: FiTarget, color: "secondary" },
            { label: "Total Raised", value: `${totalRaised.toFixed(2)} ETH`, icon: FiTrendingUp, color: "tertiary" },
            { label: "Active", value: activeCampaigns, icon: FiUsers, color: "accent" },
            { label: "Successful", value: successfulCampaigns, icon: FiTarget, color: "secondary" },
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
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-primary-800 rounded-xl shadow-lg p-6 animate-pulse">
                <div className="h-48 bg-gray-200 dark:bg-primary-700 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 dark:bg-primary-700 rounded mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-primary-700 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-primary-800 rounded-xl border border-dashed border-gray-300 dark:border-primary-700">
            <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No campaigns yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first campaign to get started with crowdfunding.
            </p>
            <button
              onClick={() => router.push("/create-campaign")}
              className="bg-gradient-emerald hover:shadow-emerald-glow text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 inline-flex items-center"
            >
              <FiPlus className="w-5 h-5 mr-2" />
              Create Your First Campaign
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}