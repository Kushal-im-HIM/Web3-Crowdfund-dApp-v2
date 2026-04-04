/**
 * pages/dashboard.js
 *
 * COMBINED BEST-OF-BOTH:
 *
 * From Patch B (structure wins):
 *   - Dedicated RecentActivity component (clean separation of concerns)
 *   - "Funded Campaigns" quick-stat card with subtitle "reached their goal"
 *   - useMemo for all derived values
 *   - stone-* cream theming on card borders and skeleton loaders
 *   - Live network name badge
 *
 * From Patch A (data accuracy wins — Mandate 3):
 *   - useContractReads batch-reads getCampaignContributions from the 4 most
 *     recently created campaigns, surfacing REAL contribution events:
 *     contributor address + ETH amount + timestamp.
 *   - RecentActivity receives these events directly so it shows "0x1234…
 *     contributed 0.25 ETH to Project X" — the actual transaction-level data
 *     the mandate asked for, not just campaign creation events.
 *   - Falls back to campaign-level activity when no contributions exist yet.
 *
 * MANDATE 2 — Dashboard Data Audit:
 *   - "Success Rate 85%" (hardcoded) → "Funded Campaigns" (real on-chain count)
 *   - All four quick-stat cards derive values from live hooks.
 *
 * MANDATE 3 — Dynamic Recent Activity Footer:
 *   - "Emerald Network" static string → live networkName from useNetworkContracts()
 *   - Activity feed sourced from real getCampaignContributions contract reads.
 *
 * MANDATE 5 — Cream aesthetic:
 *   - border-stone-100 on cards, bg-stone-* skeleton loaders.
 */

import { useAccount, useContractReads } from "wagmi";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import Layout from "../components/Layout/Layout";
import DashboardStats from "../components/Dashboard/DashboardStats";
import CampaignCard from "../components/Campaign/CampaignCard";
import { useContract } from "../hooks/useContract";
import { useNetworkContracts } from "../hooks/useNetworkContracts";
import { CROWDFUNDING_ABI } from "../constants/abi";
import { formatEther, formatAddress } from "../utils/helpers";
import {
  FiTrendingUp, FiUsers, FiTarget, FiActivity,
  FiShield, FiAward, FiClock, FiZap,
} from "react-icons/fi";

// ── RecentActivity Component ──────────────────────────────────────────────────
// COMBINED: Uses B's clean component pattern but powered by A's real
// getCampaignContributions data (individual contribution events with
// contributor address, ETH amount, and timestamp).
//
// Falls back to campaign-level display when no contributions exist yet
// (e.g. a fresh deployment with no backers).
function RecentActivity({ contributions, campaigns, networkName, isLoading }) {

  // Flatten, enrich with campaign title, sort by timestamp desc, take top 5
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
      .filter((e) => e.timestamp > 0) // drop zero-timestamp entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [contributions, campaigns]);

  // Fallback: campaign-level activity when no contributions fetched yet
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
          <div key={i} className="h-14 bg-stone-100 dark:bg-primary-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Render real contribution events ────────────────────────────────────────
  if (contributionItems.length > 0) {
    return (
      <div className="space-y-3">
        {contributionItems.map((event, i) => (
          <div
            key={i}
            className="flex items-center space-x-4 p-4 bg-stone-50 dark:bg-primary-900/50 rounded-lg border border-stone-100 dark:border-primary-700 hover:bg-stone-100 dark:hover:bg-primary-700/30 transition-colors"
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

  // ── Fallback: campaign-level activity ─────────────────────────────────────
  if (campaignItems.length > 0) {
    return (
      <div className="space-y-3">
        {campaignItems.map(({ campaign, raisedEth, targetEth, funded, date }) => (
          <div
            key={campaign.id}
            className="flex items-center space-x-4 p-4 bg-stone-50 dark:bg-primary-900/50 rounded-lg border border-stone-100 dark:border-primary-700 hover:bg-stone-100 dark:hover:bg-primary-700/30 transition-colors"
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

// ── Dashboard Page ────────────────────────────────────────────────────────────
function Dashboard() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { useActiveCampaigns, useUserCampaigns, useUserContributions } = useContract();

  // MANDATE 3: Live network name — replaces "Emerald Network"
  const { name: networkName, contractAddress: CONTRACT_ADDRESS } = useNetworkContracts();

  const { data: activeCampaigns, isLoading: loadingActive } = useActiveCampaigns(0, 8);
  // Wider fetch for activity feed and stats
  const { data: allCampaigns } = useActiveCampaigns(0, 50);
  const { data: userCampaigns } = useUserCampaigns(address);
  const { data: userContributions } = useUserContributions(address);

  // MANDATE 3 (from Patch A): Pick the 4 most recently created campaigns
  // and batch-read their real contribution events via getCampaignContributions.
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

  // MANDATE 2: Real funded campaign count — not the fake "85%"
  const fundedCampaignsCount = useMemo(() => {
    if (!allCampaigns) return 0;
    return allCampaigns.filter((c) => {
      const raised = parseFloat(formatEther(c.raisedAmount || 0));
      const target = parseFloat(formatEther(c.targetAmount || 0));
      return target > 0 && raised >= target;
    }).length;
  }, [allCampaigns]);

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

        {/* Welcome Hero */}
        <div className="relative overflow-hidden bg-gradient-slate-emerald dark:bg-gradient-slate-emerald-dark rounded-xl p-8 shadow-lg">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary-200 dark:bg-secondary-900 rounded-full opacity-20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent-200 dark:bg-accent-900 rounded-full opacity-20 blur-3xl" />
          </div>
          <div className="max-w-3xl relative z-10">
            <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Crowd Funding Marketplace Pro! 👋
            </h1>
            <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">
              Discover amazing projects, support innovative ideas, or launch your own campaign.
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

        {/* Platform Statistics */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Platform Statistics
          </h2>
          <DashboardStats />
        </div>

        {/* Quick Stats for the connected user */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-stone-100 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">My Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userCampaigns?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary-50 dark:bg-secondary-900/20 rounded-lg flex items-center justify-center">
                <FiTarget className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-stone-100 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">My Contributions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userContributions?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-tertiary-50 dark:bg-tertiary-900/20 rounded-lg flex items-center justify-center">
                <FiUsers className="w-6 h-6 text-tertiary-600 dark:text-tertiary-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-stone-100 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Active Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeCampaigns?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent-50 dark:bg-accent-900/20 rounded-lg flex items-center justify-center">
                <FiActivity className="w-6 h-6 text-accent-600 dark:text-accent-400" />
              </div>
            </div>
          </div>

          {/* MANDATE 2: Replaced hardcoded "Success Rate 85%" with real funded count */}
          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-stone-100 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Funded Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {fundedCampaignsCount}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                  reached their goal
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                <FiAward className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Featured Campaigns */}
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
                <div key={i} className="bg-white dark:bg-primary-800 rounded-xl shadow-lg p-6 animate-pulse border border-stone-100 dark:border-primary-700">
                  <div className="h-48 bg-stone-200 dark:bg-primary-700 rounded-lg mb-4" />
                  <div className="h-4 bg-stone-200 dark:bg-primary-700 rounded mb-2" />
                  <div className="h-4 bg-stone-200 dark:bg-primary-700 rounded w-3/4" />
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
            <div className="text-center py-12 bg-white dark:bg-primary-800 rounded-xl border border-dashed border-stone-300 dark:border-primary-700">
              <FiTarget className="w-16 h-16 text-stone-300 dark:text-primary-600 mx-auto mb-4" />
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

        {/* MANDATE 3: Dynamic Recent Activity — real on-chain contribution events */}
        <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-stone-100 dark:border-primary-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            {/* MANDATE 3: Real network name — replaces the hardcoded "Emerald Network" */}
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

      </div>
    </Layout>
  );
}

export default Dashboard;
