import { useAccount } from "wagmi";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Layout from "../components/Layout/Layout";
import DashboardStats from "../components/Dashboard/DashboardStats";
import CampaignCard from "../components/Campaign/CampaignCard";
import { useContract } from "../hooks/useContract";
import { FiTrendingUp, FiUsers, FiTarget, FiActivity } from "react-icons/fi";

function Dashboard() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { useActiveCampaigns, useUserCampaigns, useUserContributions } =
    useContract();

  const { data: activeCampaigns, isLoading: loadingActive } =
    useActiveCampaigns(0, 8);
  const { data: userCampaigns } = useUserCampaigns(address);
  const { data: userContributions } = useUserContributions(address);

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
              Please connect your wallet to access the dashboard.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-white">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold mb-4">
              Crowd Funding Marketplace Pro! 👋
            </h1>
            <p className="text-blue-100 text-lg mb-6">
              Discover amazing projects, support innovative ideas, or launch
              your own crowdfunding campaign.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push("/create-campaign")}
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                Create Campaign
              </button>
              <button
                onClick={() => router.push("/campaigns")}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors border border-blue-400"
              >
                Browse Campaigns
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Platform Statistics
          </h2>
          <DashboardStats />
        </div>

        {/* Quick Stats for User */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  My Campaigns
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userCampaigns?.length || 0}
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
                  Contributions
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userContributions?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <FiUsers className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Active Campaigns
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeCampaigns?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <FiActivity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Success Rate
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  85%
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <FiTrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Active Campaigns */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Featured Campaigns
            </h2>
            <button
              onClick={() => router.push("/campaigns")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              View All →
            </button>
          </div>

          {loadingActive ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
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
          ) : activeCampaigns && activeCampaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {activeCampaigns.slice(0, 4).map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
              <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Active Campaigns
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Be the first to create a campaign on our platform!
              </p>
              <button
                onClick={() => router.push("/create-campaign")}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create Campaign
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {/* Sample activity items - you can populate this with real data */}
            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  Welcome to CrowdFund Pro! Connect your wallet to see your
                  activity.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Just now
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
