import { useAccount } from "wagmi";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Layout from "../components/Layout/Layout";
import DashboardStats from "../components/Dashboard/DashboardStats";
import CampaignCard from "../components/Campaign/CampaignCard";
import { useContract } from "../hooks/useContract";
import { FiTrendingUp, FiUsers, FiTarget, FiActivity, FiShield, FiLock } from "react-icons/fi";

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
        {/* Welcome Section - UPDATED PALETTE */}
        <div className="relative overflow-hidden bg-gradient-slate-emerald dark:bg-gradient-slate-emerald-dark rounded-xl p-8 text-white shadow-lg">
          {/* Decorative Elements from index.js */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary-200 dark:bg-secondary-900 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent-200 dark:bg-accent-900 rounded-full opacity-20 blur-3xl"></div>
          </div>

          <div className="max-w-3xl relative z-10">
            <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Crowd Funding Marketplace Pro! 👋
            </h1>
            <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">
              Discover amazing projects, support innovative ideas, or launch
              your own crowdfunding campaign.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push("/create-campaign")}
                className="bg-gradient-emerald text-white px-6 py-3 rounded-lg font-medium hover:shadow-emerald-glow transition-all duration-300"
              >
                Create Campaign
              </button>
              <button
                onClick={() => router.push("/campaigns")}
                className="bg-white dark:bg-primary-800 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-medium border-2 border-gray-300 dark:border-primary-600 hover:border-secondary-500 transition-all duration-300"
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

        {/* Quick Stats for User - UPDATED COLORS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-100 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  My Campaigns
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userCampaigns?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary-50 dark:bg-secondary-900/20 rounded-lg flex items-center justify-center">
                <FiTarget className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-100 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Contributions
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userContributions?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-tertiary-50 dark:bg-tertiary-900/20 rounded-lg flex items-center justify-center">
                <FiUsers className="w-6 h-6 text-tertiary-600 dark:text-tertiary-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-100 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Active Campaigns
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeCampaigns?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent-50 dark:bg-accent-900/20 rounded-lg flex items-center justify-center">
                <FiActivity className="w-6 h-6 text-accent-600 dark:text-accent-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-100 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Success Rate
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  85%
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary-50 dark:bg-secondary-900/20 rounded-lg flex items-center justify-center">
                <FiTrendingUp className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
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
              className="text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 font-medium"
            >
              View All →
            </button>
          </div>

          {loadingActive ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-primary-800 rounded-xl shadow-lg p-6 animate-pulse"
                >
                  <div className="h-48 bg-gray-200 dark:bg-primary-700 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-primary-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-primary-700 rounded w-3/4"></div>
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
            <div className="text-center py-12 bg-white dark:bg-primary-800 rounded-xl border border-dashed border-gray-300 dark:border-primary-700">
              <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Active Campaigns
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Be the first to create a campaign on our platform!
              </p>
              <button
                onClick={() => router.push("/create-campaign")}
                className="bg-gradient-emerald text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-emerald-glow"
              >
                Create Campaign
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-200 dark:border-primary-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-primary-900/50 rounded-lg">
              <div className="w-2 h-2 bg-secondary-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  Welcome to CrowdFund Pro! Your dashboard is now synced with the Emerald network.
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