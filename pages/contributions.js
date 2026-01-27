import { useAccount, useContractReads } from "wagmi";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import Layout from "../components/Layout/Layout";
import { useContract } from "../hooks/useContract";
import {
  FiHeart,
  FiExternalLink,
  FiDollarSign,
  FiCalendar,
} from "react-icons/fi";
import { formatEther, formatAddress, formatDate } from "../utils/helpers";
import { CONTRACT_ADDRESS } from "../constants";
import { CROWDFUNDING_ABI } from "../constants/abi";

export default function ContributionsPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { useUserContributions } = useContract();
  const [contributions, setContributions] = useState([]);

  const { data: contributionCampaignIds, isLoading: loadingIds } =
    useUserContributions(address);

  // Prepare contract calls for both campaign details and user contributions
  const contractCalls = useMemo(() => {
    if (
      !contributionCampaignIds ||
      contributionCampaignIds.length === 0 ||
      !address
    )
      return [];

    const calls = [];

    contributionCampaignIds.forEach((campaignId) => {
      const numericId =
        typeof campaignId === "bigint"
          ? Number(campaignId)
          : Number(campaignId.toString());

      // Get campaign details
      calls.push({
        address: CONTRACT_ADDRESS,
        abi: CROWDFUNDING_ABI,
        functionName: "getCampaign",
        args: [numericId],
      });

      // Get user's contribution amount for this campaign
      calls.push({
        address: CONTRACT_ADDRESS,
        abi: CROWDFUNDING_ABI,
        functionName: "getContribution",
        args: [numericId, address],
      });
    });

    return calls;
  }, [contributionCampaignIds, address]);

  // Fetch all data
  const { data: contractData, isLoading: loadingData } = useContractReads({
    contracts: contractCalls,
    enabled: contractCalls.length > 0,
    watch: true,
  });

  const loading = loadingIds || loadingData;

  // Process the data
  useEffect(() => {
    if (contractData && contributionCampaignIds && address) {
      const processedContributions = [];

      // Process data in pairs (campaign details + contribution amount)
      for (let i = 0; i < contractData.length; i += 2) {
        const campaignResult = contractData[i];
        const contributionResult = contractData[i + 1];

        if (
          campaignResult.status === "success" &&
          contributionResult.status === "success"
        ) {
          const campaignData = campaignResult.result;
          const contributionAmount = contributionResult.result;

          // Only include if user actually contributed
          if (contributionAmount && contributionAmount > 0) {
            const safeBigNumber = (value) => {
              if (!value) return 0n;
              if (typeof value === "bigint") return value;
              if (value.toString) return BigInt(value.toString());
              return BigInt(value);
            };

            const safeBigNumberToNumber = (value) => {
              if (!value) return 0;
              if (typeof value === "bigint") return Number(value);
              if (value.toString) return Number(value.toString());
              return Number(value);
            };

            processedContributions.push({
              campaignId: safeBigNumberToNumber(campaignData.id),
              campaignTitle: campaignData.title,
              campaignDescription: campaignData.description,
              amount: safeBigNumber(contributionAmount),
              targetAmount: safeBigNumber(campaignData.targetAmount),
              raisedAmount: safeBigNumber(campaignData.raisedAmount),
              deadline: safeBigNumberToNumber(campaignData.deadline),
              active: campaignData.active,
              // Note: We don't have timestamp from getUserContributions,
              // you'd need to implement getCampaignContributions for that
              timestamp: null,
            });
          }
        }
      }

      setContributions(processedContributions);
    } else if (
      contributionCampaignIds &&
      contributionCampaignIds.length === 0
    ) {
      setContributions([]);
    }
  }, [contractData, contributionCampaignIds, address]);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
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
              Please connect your wallet to view your contributions.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalContributed = contributions.reduce((sum, contribution) => {
    return sum + parseFloat(formatEther(contribution.amount || 0));
  }, 0);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Contributions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your support for innovative projects
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Total Contributed
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalContributed.toFixed(4)} ETH
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
                  Projects Supported
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {contributions.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FiHeart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Average Contribution
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {contributions.length > 0
                    ? (totalContributed / contributions.length).toFixed(4)
                    : "0.00"}{" "}
                  ETH
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <FiCalendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Contributions List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : contributions.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Contribution History
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {contributions.map((contribution, index) => {
                const progress =
                  (parseFloat(formatEther(contribution.raisedAmount)) /
                    parseFloat(formatEther(contribution.targetAmount))) *
                  100;
                const isActive =
                  contribution.active &&
                  new Date(contribution.deadline * 1000) > new Date();

                return (
                  <div
                    key={index}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <FiHeart className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {contribution.campaignTitle}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            {contribution.campaignDescription?.slice(0, 100)}...
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Progress: {progress.toFixed(1)}%</span>
                            <span
                              className={`px-2 py-1 rounded-full ${
                                isActive
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {isActive ? "Active" : "Ended"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatEther(contribution.amount)} ETH
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          Target: {formatEther(contribution.targetAmount)} ETH
                        </p>
                        <button
                          onClick={() =>
                            router.push(`/campaign/${contribution.campaignId}`)
                          }
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm inline-flex items-center"
                        >
                          View Campaign
                          <FiExternalLink className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
            <FiHeart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No contributions yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start supporting innovative projects and make a difference.
            </p>
            <button
              onClick={() => router.push("/campaigns")}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center"
            >
              Browse Campaigns
              <FiExternalLink className="w-5 h-5 ml-2" />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
