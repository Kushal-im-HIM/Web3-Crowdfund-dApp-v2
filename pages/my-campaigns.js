import { useAccount, useContractReads } from "wagmi";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import Layout from "../components/Layout/Layout";
import CampaignCard from "../components/Campaign/CampaignCard";
import { useContract } from "../hooks/useContract";
import { FiPlus, FiTarget, FiTrendingUp, FiUsers } from "react-icons/fi";
import { formatEther, calculateProgress } from "../utils/helpers";
import { CONTRACT_ADDRESS } from "../constants";
import { CROWDFUNDING_ABI } from "../constants/abi";

export default function MyCampaignsPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { useUserCampaigns } = useContract();
  const [campaigns, setCampaigns] = useState([]);

  const { data: campaignIds, isLoading: loadingIds } =
    useUserCampaigns(address);

  // Debug: Log the campaignIds
  useEffect(() => {
    console.log("🔍 Campaign IDs from contract:", campaignIds);
    console.log("🔍 Campaign IDs type:", typeof campaignIds);
    console.log("🔍 Campaign IDs length:", campaignIds?.length);
  }, [campaignIds]);

  // Convert BigNumber to regular numbers and prepare contract calls
  const campaignContracts = useMemo(() => {
    if (!campaignIds || campaignIds.length === 0) {
      console.log("❌ No campaign IDs available");
      return [];
    }

    // Convert BigNumbers to regular numbers - handle different BigNumber types
    const convertedIds = campaignIds.map((id) => {
      let numberId;
      if (typeof id === "bigint") {
        numberId = Number(id);
      } else if (id && typeof id.toString === "function") {
        numberId = Number(id.toString());
      } else {
        numberId = Number(id);
      }
      console.log(`🔄 Converting campaign ID: ${id} -> ${numberId}`);
      return numberId;
    });

    console.log("✅ Converted campaign IDs:", convertedIds);

    const contracts = convertedIds.map((campaignId) => ({
      address: CONTRACT_ADDRESS,
      abi: CROWDFUNDING_ABI,
      functionName: "getCampaign",
      args: [campaignId],
    }));

    console.log("📋 Contract calls prepared:", contracts);
    return contracts;
  }, [campaignIds]);

  // Fetch all campaigns data
  const {
    data: campaignsData,
    isLoading: loadingCampaigns,
    error: contractError,
  } = useContractReads({
    contracts: campaignContracts,
    enabled: campaignContracts.length > 0,
    watch: true,
  });

  // Debug: Log the campaigns data
  useEffect(() => {
    console.log("📊 Campaigns data from contract:", campaignsData);
    console.log("⏳ Loading campaigns:", loadingCampaigns);
    console.log("❗ Contract error:", contractError);
  }, [campaignsData, loadingCampaigns, contractError]);

  // Overall loading state
  const loading = loadingIds || loadingCampaigns;

  // Process campaigns data when it changes
  useEffect(() => {
    console.log("🔄 Processing campaigns data...");

    if (campaignsData && campaignIds) {
      console.log("✅ Both campaignsData and campaignIds available");

      const formattedCampaigns = campaignsData
        .map((result, index) => {
          console.log(`📝 Processing campaign ${index}:`, result);

          if (result.status === "success" && result.result) {
            const campaignData = result.result;
            console.log("✅ Campaign data:", campaignData);

            // Helper function to safely convert BigNumbers
            const safeBigNumberToNumber = (value) => {
              if (!value) return 0;
              if (typeof value === "bigint") return Number(value);
              if (value.toString) return Number(value.toString());
              return Number(value);
            };

            // Helper function to safely convert BigNumbers but keep them as BigNumbers for calculations
            const safeBigNumber = (value) => {
              if (!value) return 0n;
              if (typeof value === "bigint") return value;
              if (value.toString) return BigInt(value.toString());
              return BigInt(value);
            };

            // Handle BigNumbers properly
            const formattedCampaign = {
              id: safeBigNumberToNumber(campaignData.id || campaignIds[index]),
              creator: campaignData.creator,
              title: campaignData.title,
              description: campaignData.description,
              metadataHash: campaignData.metadataHash,
              targetAmount: safeBigNumber(campaignData.targetAmount),
              raisedAmount: safeBigNumber(campaignData.raisedAmount),
              deadline: safeBigNumberToNumber(campaignData.deadline),
              withdrawn: campaignData.withdrawn,
              active: campaignData.active,
              createdAt: safeBigNumberToNumber(campaignData.createdAt),
              contributorsCount: safeBigNumberToNumber(
                campaignData.contributorsCount
              ),
            };

            console.log("🎯 Formatted campaign:", formattedCampaign);
            return formattedCampaign;
          } else {
            console.error(
              `❌ Failed to fetch campaign ${campaignIds[index]}:`,
              result.error
            );
            return null;
          }
        })
        .filter(Boolean);

      console.log("🎉 Final formatted campaigns:", formattedCampaigns);
      setCampaigns(formattedCampaigns);
    } else if (campaignIds && campaignIds.length === 0) {
      console.log("📭 User has no campaigns");
      setCampaigns([]);
    } else {
      console.log("⏸️ Waiting for data...", { campaignsData, campaignIds });
    }
  }, [campaignsData, campaignIds]);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  // Debug: Log final state
  useEffect(() => {
    console.log("🏁 Final state:", {
      campaigns,
      loading,
      campaignsCount: campaigns.length,
    });
  }, [campaigns, loading]);

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

  // Calculate totals
  const totalRaised = campaigns.reduce((sum, campaign) => {
    return sum + parseFloat(formatEther(campaign.raisedAmount || 0));
  }, 0);

  const successfulCampaigns = campaigns.filter((campaign) => {
    const progress = calculateProgress(
      campaign.raisedAmount,
      campaign.targetAmount
    );
    return progress >= 100;
  }).length;

  const activeCampaigns = campaigns.filter(
    (campaign) =>
      campaign.active && new Date(campaign.deadline * 1000) > new Date()
  ).length;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Campaigns
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and track your crowdfunding campaigns
            </p>
          </div>

          <button
            onClick={() => router.push("/create-campaign")}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 inline-flex items-center"
          >
            <FiPlus className="w-5 h-5 mr-2" />
            Create Campaign
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Total Campaigns
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {campaigns.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FiTarget className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Total Raised
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalRaised.toFixed(2)} ETH
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <FiTrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Active
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeCampaigns}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <FiUsers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Successful
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {successfulCampaigns}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <FiTarget className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse"
              >
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : campaigns.length > 0 ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
            <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No campaigns yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first campaign to get started with crowdfunding.
            </p>
            <button
              onClick={() => router.push("/create-campaign")}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center"
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
