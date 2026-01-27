import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAccount, useContractRead } from "wagmi";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import {
  FiUser,
  FiClock,
  FiTarget,
  FiTrendingUp,
  FiShare2,
  FiExternalLink,
  FiHeart,
  FiUsers,
  FiCalendar,
  FiDollarSign,
} from "react-icons/fi";
import { useContract } from "../../hooks/useContract";
import { getFromIPFS } from "../../utils/ipfs";
import {
  formatEther,
  formatAddress,
  calculateTimeLeft,
  calculateProgress,
  formatDate,
  copyToClipboard,
} from "../../utils/helpers";
import { CONTRACT_ADDRESS } from "../../constants";
import { CROWDFUNDING_ABI } from "../../constants/abi";

export default function CampaignDetails({ campaignId }) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const {
    useCampaign,
    useCampaignStats,
    useContributeToCampaignSimple,
    useWithdrawFunds,
    useGetRefund,
    useContribution,
  } = useContract();

  const [metadata, setMetadata] = useState(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: campaign, isLoading: campaignLoading } =
    useCampaign(campaignId);
  const { data: stats } = useCampaignStats(campaignId);
  const { data: userContribution } = useContribution(campaignId, address);
  const { contribute, isLoading: contributing } =
    useContributeToCampaignSimple();
  const { withdrawFunds, isLoading: withdrawing } = useWithdrawFunds();
  const { getRefund, isLoading: refunding } = useGetRefund();

  // Fetch campaign contributions
  const { data: contributions, isLoading: loadingContributions } =
    useContractRead({
      address: CONTRACT_ADDRESS,
      abi: CROWDFUNDING_ABI,
      functionName: "getCampaignContributions",
      args: [campaignId],
      enabled: Boolean(campaignId && CONTRACT_ADDRESS),
      watch: true,
      cacheTime: 30000,
    });

  useEffect(() => {
    const fetchMetadata = async () => {
      if (campaign?.metadataHash) {
        const result = await getFromIPFS(campaign.metadataHash);
        if (result.success) {
          setMetadata(result.data);
        }
      }
    };

    fetchMetadata();
  }, [campaign?.metadataHash]);

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Campaign Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The campaign you're looking for doesn't exist or has been removed.
        </p>
        <button
          onClick={() => router.push("/campaigns")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Browse Campaigns
        </button>
      </div>
    );
  }

  const progress = calculateProgress(
    campaign.raisedAmount,
    campaign.targetAmount
  );
  const timeLeft = calculateTimeLeft(campaign.deadline);
  const raisedAmount = formatEther(campaign.raisedAmount);
  const targetAmount = formatEther(campaign.targetAmount);
  const isCreator = address?.toLowerCase() === campaign.creator?.toLowerCase();
  const isSuccessful = parseFloat(raisedAmount) >= parseFloat(targetAmount);
  const canWithdraw =
    isCreator && timeLeft.expired && isSuccessful && !campaign.withdrawn;
  const canGetRefund =
    !isCreator && timeLeft.expired && !isSuccessful && userContribution > 0;

  // Process contributions data
  const processedContributions = contributions
    ? contributions
        .map((contribution) => ({
          contributor: contribution.contributor,
          amount: contribution.amount,
          timestamp: contribution.timestamp
            ? Number(contribution.timestamp.toString())
            : null,
        }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    : [];

  // Group contributions by contributor
  const contributorSummary = processedContributions.reduce(
    (acc, contribution) => {
      const contributor = contribution.contributor;
      if (!acc[contributor]) {
        acc[contributor] = {
          address: contributor,
          totalAmount: 0n,
          contributionCount: 0,
          lastContribution: contribution.timestamp,
        };
      }
      acc[contributor].totalAmount += BigInt(contribution.amount.toString());
      acc[contributor].contributionCount += 1;
      if (
        contribution.timestamp &&
        contribution.timestamp > acc[contributor].lastContribution
      ) {
        acc[contributor].lastContribution = contribution.timestamp;
      }
      return acc;
    },
    {}
  );

  const uniqueContributors = Object.values(contributorSummary).sort((a, b) =>
    Number(b.totalAmount - a.totalAmount)
  );

  const handleContribute = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      toast.error("Please enter a valid contribution amount");
      return;
    }

    try {
      await contribute?.({
        args: [campaignId],
        value: ethers.utils.parseEther(contributionAmount),
      });
      setContributionAmount("");
    } catch (error) {
      console.error("Contribution error:", error);
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdrawFunds?.({
        args: [campaignId],
      });
    } catch (error) {
      console.error("Withdrawal error:", error);
    }
  };

  const handleRefund = async () => {
    try {
      await getRefund?.({
        args: [campaignId],
      });
    } catch (error) {
      console.error("Refund error:", error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success("Campaign link copied to clipboard!");
    } else {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        {/* Campaign Image */}
        <div className="relative h-64 md:h-96 bg-gradient-to-r from-blue-500 to-purple-600">
          {metadata?.image ? (
            <img
              src={metadata.image}
              alt={campaign.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-white text-8xl font-bold opacity-20">
                {campaign.title?.charAt(0) || "C"}
              </div>
            </div>
          )}

          {/* Overlay Info */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="flex space-x-2">
              <span
                className={`
                px-3 py-1 text-sm font-medium rounded-full backdrop-blur-sm
                ${
                  campaign.active
                    ? "bg-green-500 bg-opacity-80 text-white"
                    : "bg-red-500 bg-opacity-80 text-white"
                }
              `}
              >
                {campaign.active ? "Active" : "Inactive"}
              </span>

              {isSuccessful && (
                <span className="px-3 py-1 text-sm font-medium bg-yellow-500 bg-opacity-80 text-white rounded-full backdrop-blur-sm">
                  Funded
                </span>
              )}
            </div>

            <button
              onClick={handleShare}
              className="p-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-full hover:bg-opacity-30 transition-all"
            >
              <FiShare2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:space-x-8">
            {/* Left Column */}
            <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {campaign.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                  {campaign.description}
                </p>
              </div>

              {/* Creator Info */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <FiUser className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Created by
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatAddress(campaign.creator)}
                    {isCreator && (
                      <span className="ml-2 text-blue-500">(You)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Stats & Actions */}
            <div className="lg:w-96 mt-8 lg:mt-0">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 space-y-6">
                {/* Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progress
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-4">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {parseFloat(raisedAmount).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ETH Raised
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {parseFloat(targetAmount).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ETH Target
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {uniqueContributors.length}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Contributors
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {timeLeft.expired ? "0" : timeLeft.text.split(" ")[0]}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {timeLeft.expired ? "Expired" : "Days Left"}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!timeLeft.expired &&
                    campaign.active &&
                    !isCreator &&
                    isConnected && (
                      <div className="space-y-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00 ETH"
                          value={contributionAmount}
                          onChange={(e) =>
                            setContributionAmount(e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                        />
                        <button
                          onClick={handleContribute}
                          disabled={contributing || !contributionAmount}
                          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                        >
                          {contributing ? "Contributing..." : "Contribute Now"}
                        </button>
                      </div>
                    )}

                  {canWithdraw && (
                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawing}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                      {withdrawing ? "Withdrawing..." : "Withdraw Funds"}
                    </button>
                  )}

                  {canGetRefund && (
                    <button
                      onClick={handleRefund}
                      disabled={refunding}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                      {refunding ? "Processing..." : "Get Refund"}
                    </button>
                  )}

                  {!isConnected && (
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                        Connect your wallet to contribute
                      </p>
                    </div>
                  )}
                </div>

                {/* User Contribution */}
                {userContribution > 0 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Your contribution:{" "}
                      <span className="font-medium">
                        {formatEther(userContribution)} ETH
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {["overview", "updates", "contributors"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === "contributors" && uniqueContributors.length > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    {uniqueContributors.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Campaign Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <FiCalendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Created:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatDate(campaign.createdAt)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiClock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Deadline:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatDate(campaign.deadline)}
                  </span>
                </div>
                {metadata?.category && (
                  <div className="flex items-center space-x-2">
                    <FiTarget className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Category:
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {metadata.category}
                    </span>
                  </div>
                )}
                {metadata?.tags?.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      Tags:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {metadata.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {metadata?.additionalInfo && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Additional Information
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {metadata.additionalInfo}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "updates" && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No updates available for this campaign yet.
            </p>
          </div>
        )}

        {activeTab === "contributors" && (
          <div>
            {loadingContributions ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : uniqueContributors.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Contributors ({uniqueContributors.length})
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Total contributions: {processedContributions.length}
                  </div>
                </div>

                <div className="space-y-3">
                  {uniqueContributors.map((contributor, index) => (
                    <div
                      key={contributor.address}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatAddress(contributor.address)}
                            {contributor.address.toLowerCase() ===
                              address?.toLowerCase() && (
                              <span className="ml-2 text-blue-500 text-sm">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {contributor.contributionCount} contribution
                            {contributor.contributionCount !== 1 ? "s" : ""}
                            {contributor.lastContribution && (
                              <span className="ml-2">
                                • Last:{" "}
                                {formatDate(contributor.lastContribution)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatEther(contributor.totalAmount)} ETH
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {(
                            (Number(formatEther(contributor.totalAmount)) /
                              Number(raisedAmount)) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Contributions */}
                {processedContributions.length > uniqueContributors.length && (
                  <div className="mt-8">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                      Recent Contributions
                    </h4>
                    <div className="space-y-2">
                      {processedContributions
                        .slice(0, 10)
                        .map((contribution, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm"
                          >
                            <div className="flex items-center space-x-2">
                              <FiHeart className="w-4 h-4 text-red-500" />
                              <span className="text-gray-900 dark:text-white">
                                {formatAddress(contribution.contributor)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatEther(contribution.amount)} ETH
                              </span>
                              {contribution.timestamp && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {formatDate(contribution.timestamp)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No contributors yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Be the first to support this campaign!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
