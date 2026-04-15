/**
 * pages/dashboard.js — FIXED
 *
 * Bugs fixed in this revision:
 *  1. Closing tags (Layout, RouteGuard) were misplaced inside RecentActivity empty-state
 *  2. RouteGuard wrapper was opened but never closed in Dashboard main return
 *  3. Removed redundant useEffect router.push (RouteGuard handles this)
 *  4. Removed redundant if (!isConnected) guard block (RouteGuard handles this)
 *  5. Fixed grid div nesting for Leaderboard + Activity section
 *  6. Cleaned all duplicate/conflicting isConnected checks
 */

import { useAccount, useContractReads } from "wagmi";
import { useRouter } from "next/router";
import { useMemo } from "react";
import Layout from "../components/Layout/Layout";
import RouteGuard from "../components/RouteGuard";
import DashboardStats from "../components/Dashboard/DashboardStats";
import TopContributors from "../components/Dashboard/TopContributors";
import { CampaignCardSkeleton } from "../components/SkeletonCard";
import CampaignCard from "../components/Campaign/CampaignCard";
import { useContract } from "../hooks/useContract";
import { useNetworkContracts } from "../hooks/useNetworkContracts";
import { CROWDFUNDING_ABI } from "../constants/abi";
import { formatEther, formatAddress } from "../utils/helpers";
import {
  FiTrendingUp, FiUsers, FiTarget, FiActivity,
  FiShield, FiAward, FiClock,
} from "react-icons/fi";

// ── RecentActivity ─────────────────────────────────────────────────────────────
function RecentActivity({ contributions, campaigns, networkName, isLoading }) {
  const contributionItems = useMemo(() => {
    if (!contributions || contributions.length === 0) return [];
    return contributions
      .flatMap((result, idx) => {
        const campaign = campaigns?.[idx];
        const raw = result?.result ?? result ?? [];
        return (Array.isArray(raw) ? raw : []).map((c) => ({
          contributor: c.contributor,
          amount: c.amount,
          timestamp: Number(c.timestamp?.toString() || 0),
          campaignTitle: campaign?.title || `Campaign #${campaign?.id ?? idx + 1}`,
          campaignId: campaign?.id,
        }));
      })
      .filter((e) => e.timestamp > 0)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [contributions, campaigns]);

  const campaignItems = useMemo(() => {
    if (contributionItems.length > 0 || !campaigns) return [];
    return [...campaigns]
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
      .slice(0, 5)
      .map((c) => {
        const raisedEth = parseFloat(formatEther(c.raisedAmount || 0));
        const targetEth = parseFloat(formatEther(c.targetAmount || 0));
        const funded = targetEth > 0 && raisedEth >= targetEth;
        const date = c.createdAt
          ? new Date(Number(c.createdAt) * 1000).toLocaleString(undefined, {
            month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
          })
          : "Recently";
        return { campaign: c, raisedEth, targetEth, funded, date };
      });
  }, [contributionItems, campaigns]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-emerald-100 dark:bg-primary-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (contributionItems.length > 0) {
    return (
      <div className="space-y-3">
        {contributionItems.map((event, i) => (
          <div
            key={i}
            className="flex items-center space-x-4 p-4 bg-emerald-50 dark:bg-primary-900/50 rounded-lg border border-emerald-100 dark:border-primary-700 hover:bg-emerald-100 dark:hover:bg-primary-700/30 transition-colors"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-secondary-500 flex-shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-white truncate">
                <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                  {formatAddress(event.contributor)}
                </span>
                {" contributed "}
                <span className="font-bold text-secondary-600 dark:text-secondary-400">
                  {parseFloat(formatEther(event.amount)).toFixed(4)} ETH
                </span>
                {" to "}
                <span className="font-semibold">{event.campaignTitle}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                <FiClock className="w-3 h-3" />
                {new Date(event.timestamp * 1000).toLocaleString(undefined, {
                  month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
                {" · "}
                <span className="font-medium text-secondary-600 dark:text-secondary-400">
                  {networkName}
                </span>
              </p>
            </div>
          </div>
        ))}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right pt-1 flex items-center justify-end gap-1">
          <FiShield className="w-3 h-3" />
          Live on-chain data ·{" "}
          <span className="font-semibold text-secondary-500">{networkName}</span>
        </p>
      </div>
    );
  }

  if (campaignItems.length > 0) {
    return (
      <div className="space-y-3">
        {campaignItems.map(({ campaign, raisedEth, targetEth, funded, date }) => (
          <div
            key={campaign.id}
            className="flex items-center space-x-4 p-4 bg-emerald-50 dark:bg-primary-900/50 rounded-lg border border-emerald-100 dark:border-primary-700 hover:bg-emerald-100 dark:hover:bg-primary-700/30 transition-colors"
          >
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${funded ? "bg-emerald-500" : "bg-secondary-400"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                {funded ? "✓ " : ""}
                <span className="font-semibold">{campaign.title}</span>
                {" — "}
                {funded
                  ? `fully funded at ${raisedEth.toFixed(3)} ETH`
                  : `${raisedEth.toFixed(3)} / ${targetEth.toFixed(3)} ETH raised`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                <FiClock className="w-3 h-3" />
                Created {date} ·{" "}
                <span className="font-medium text-secondary-600 dark:text-secondary-400">
                  {networkName}
                </span>
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">#{campaign.id}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{campaign.contributorsCount || 0} backers</p>
            </div>
          </div>
        ))}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right pt-1 flex items-center justify-end gap-1">
          <FiShield className="w-3 h-3" />
          Live on-chain data ·{" "}
          <span className="font-semibold text-secondary-500">{networkName}</span>
        </p>
      </div>
    );
  }

  return (
    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
      No campaign activity yet. Create the first campaign!
    </p>
  );
}

// ── Dashboard Page ─────────────────────────────────────────────────────────────
function Dashboard() {
  const { address } = useAccount();
  const router = useRouter();
  const { useActiveCampaigns, useUserCampaigns, useUserContributions } = useContract();
  const { name: networkName, contractAddress: CONTRACT_ADDRESS } = useNetworkContracts();

  const { data: activeCampaigns, isLoading: loadingActive } = useActiveCampaigns(0, 8);
  const { data: allCampaigns } = useActiveCampaigns(0, 50);
  const { data: userCampaigns } = useUserCampaigns(address);
  const { data: userContributions } = useUserContributions(address);

  const recentCampaigns = useMemo(() => {
    if (!allCampaigns) return [];
    return [...allCampaigns]
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
      .slice(0, 4);
  }, [allCampaigns]);

  const { data: batchContributions, isLoading: loadingContributions } = useContractReads({
    contracts: recentCampaigns.map((c) => ({
      address: CONTRACT_ADDRESS,
      abi: CROWDFUNDING_ABI,
      functionName: "getCampaignContributions",
      args: [c.id],
    })),
    enabled: recentCampaigns.length > 0 && Boolean(CONTRACT_ADDRESS),
    watch: false,
  });

  const fundedCampaignsCount = useMemo(() => {
    if (!allCampaigns) return 0;
    return allCampaigns.filter((c) => {
      const raised = parseFloat(formatEther(c.raisedAmount || 0));
      const target = parseFloat(formatEther(c.targetAmount || 0));
      return target > 0 && raised >= target;
    }).length;
  }, [allCampaigns]);


  return (
    <RouteGuard>
      <Layout>
        <div className="space-y-8">

          {/* Welcome Hero */}
          <div className="relative overflow-hidden bg-gradient-slate-emerald dark:bg-gradient-slate-emerald-dark rounded-xl p-8 shadow-lg border border-emerald-100 dark:border-primary-700">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary-200 dark:bg-secondary-900 rounded-full opacity-20 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent-200 dark:bg-accent-900 rounded-full opacity-20 blur-3xl" />
            </div>
            <div className="max-w-3xl relative z-10">
              <h1 className="text-3xl font-bold mb-2 font-display text-slate-900 dark:text-white">
                Welcome to the Ethos Console 🌿
              </h1>
              <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">
                Discover amazing projects, support innovative ideas, or launch your own campaign.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => router.push("/create-campaign")}
                  className="bg-gradient-emerald text-white px-6 py-3 rounded-lg font-semibold hover:shadow-emerald-glow transition-all duration-300"
                >
                  Create Campaign
                </button>
                <button
                  onClick={() => router.push("/campaigns")}
                  className="bg-white dark:bg-primary-800 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 dark:border-primary-600 hover:border-secondary-500 transition-all duration-300"
                >
                  Browse Campaigns
                </button>
              </div>
            </div>
          </div>

          {/* Platform Statistics */}
          <div>
            <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white mb-6 section-heading-accent">
              EthosFund Statistics
            </h2>
            <DashboardStats />
          </div>

          {/* User Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              {
                label: "My Campaigns",
                value: userCampaigns?.length || 0,
                icon: FiTarget,
                color: "secondary",
              },
              {
                label: "My Contributions",
                value: userContributions?.length || 0,
                icon: FiUsers,
                color: "tertiary",
              },
              {
                label: "Active Campaigns",
                value: activeCampaigns?.length || 0,
                icon: FiActivity,
                color: "accent",
              },
              {
                label: "Funded Campaigns",
                value: fundedCampaignsCount,
                icon: FiAward,
                color: "emerald",
                sub: "reached their goal",
              },
            ].map(({ label, value, icon: Icon, color, sub }) => (
              <div key={label} className="bg-white dark:bg-primary-800 rounded-xl p-5 border border-emerald-100 dark:border-primary-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{label}</p>
                    <p className="text-2xl font-bold font-display text-slate-900 dark:text-white mt-0.5">{value}</p>
                    {sub && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">{sub}</p>
                    )}
                  </div>
                  <div className={`w-11 h-11 bg-${color}-50 dark:bg-${color}-900/20 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Featured Campaigns */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white section-heading-accent">
                Featured Campaigns
              </h2>
              <button
                onClick={() => router.push("/campaigns")}
                className="text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 font-medium text-sm"
              >
                View All →
              </button>
            </div>

            {loadingActive ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                {[...Array(4)].map((_, i) => <CampaignCardSkeleton key={i} />)}
              </div>
            ) : activeCampaigns && activeCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                {activeCampaigns.slice(0, 4).map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-primary-800 rounded-xl border border-dashed border-emerald-200 dark:border-primary-700">
                <FiTarget className="w-16 h-16 text-slate-300 dark:text-primary-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Active Campaigns Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Be the first to launch a campaign on EthosFund!
                </p>
                <button
                  onClick={() => router.push("/create-campaign")}
                  className="bg-gradient-emerald text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-emerald-glow"
                >
                  Create Campaign
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Recent Activity — spans 2 of 3 cols */}
            <div className="lg:col-span-2 bg-white dark:bg-primary-800 rounded-xl p-6 border border-emerald-100 dark:border-primary-700 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white section-heading-accent">
                  Recent Activity
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-500 animate-pulse" />
                  Live · {networkName}
                </div>
              </div>
              <RecentActivity
                contributions={batchContributions}
                campaigns={recentCampaigns}
                networkName={networkName}
                isLoading={loadingContributions && recentCampaigns.length > 0}
              />
            </div>

            {/* Leaderboard — 1 col */}
            <div className="lg:col-span-1">
              <TopContributors />
            </div>

          </div>

        </div>
      </Layout>
    </RouteGuard>
  );
}

export default Dashboard;
