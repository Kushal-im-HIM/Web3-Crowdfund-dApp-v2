/**
 * pages/campaigns/index.js
 *
 * Filter fix — classify() updated to correctly identify milestone-based
 * completed campaigns.
 *
 * PROBLEM:
 *   For milestone campaigns, campaign.withdrawn is NEVER set to true (each
 *   milestone's funds are withdrawn individually via withdrawMilestoneFunds,
 *   not the campaign's withdrawCampaignFunds). So the old check
 *   `funded && withdrawn === true` never caught these as "completed".
 *   They fell through to "active" or "funded_pending", which caused:
 *   - Active tab: showing "Campaign Complete" campaigns (wrong)
 *   - Completed tab: always empty even when campaigns finished (wrong)
 *
 * FIX — three-signal classify():
 *   Signal A: campaign.withdrawn === true → completed (non-milestone campaigns)
 *   Signal B: raisedAmount === "0" AND contributorsCount > 0 → completed
 *             (milestone campaigns where all funds were released: the contract
 *             decremented raisedAmount to 0 through milestone withdrawals, but
 *             contributors exist proving it was once funded)
 *   Signal C: raisedAmount >= targetAmount AND !withdrawn → funded_pending
 *             (fully funded but funds not yet released — visible in All only)
 *   Signal D: deadline past AND underfunded → expired (visible in All only)
 *   Signal E: deadline in future AND underfunded → active
 *
 * Issue 3: URL query param persistence (unchanged from previous version)
 */

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout/Layout";
import CampaignCard from "../../components/Campaign/CampaignCard";
import { useContract } from "../../hooks/useContract";
import {
  FiSearch, FiFilter, FiGrid, FiList,
  FiCheckCircle, FiActivity,
} from "react-icons/fi";
import { CampaignCardSkeleton } from "../../components/SkeletonCard";

const TABS = [
  {
    key: "active",
    label: "Active",
    icon: FiActivity,
    desc: "Campaigns currently accepting contributions — deadline not reached, goal not yet met",
  },
  {
    key: "completed",
    label: "Completed",
    icon: FiCheckCircle,
    desc: "Campaigns fully funded AND where all funds have been released to the creator",
  },
  {
    key: "all",
    label: "All",
    icon: FiFilter,
    desc: "Every campaign on EthosFund (excludes admin-deactivated campaigns)",
  },
];

const VALID_FILTERS = TABS.map((t) => t.key);
const DEFAULT_FILTER = "active";

export default function CampaignsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("newest");

  // Issue 3: active tab driven by URL ?filter= param
  const filterFromUrl = router.query.filter;
  const activeTab = VALID_FILTERS.includes(filterFromUrl) ? filterFromUrl : DEFAULT_FILTER;

  const setActiveTab = (tab) => {
    router.push({ pathname: router.pathname, query: { filter: tab } }, undefined, { shallow: true });
  };

  useEffect(() => {
    if (router.isReady && !filterFromUrl) {
      router.replace(
        { pathname: router.pathname, query: { filter: DEFAULT_FILTER } },
        undefined,
        { shallow: true }
      );
    }
  }, [router.isReady, filterFromUrl]);

  const { useActiveCampaigns } = useContract();
  const { data: campaigns, isLoading } = useActiveCampaigns(0, 100);

  const now = Math.floor(Date.now() / 1000);

  /**
   * classify() — categorise a campaign into one of these buckets:
   *   "active"        → accepting contributions right now
   *   "completed"     → all funds have left the contract (withdrawn or released)
   *   "funded_pending"→ funded but funds not yet released (shown in All only)
   *   "expired"       → deadline passed, goal not met (shown in All only)
   */
  const classify = (c) => {
    const raisedBig = BigInt(c.raisedAmount?.toString() ?? "0");
    const targetBig = BigInt(c.targetAmount?.toString() ?? "1");
    const funded = raisedBig >= targetBig;
    const expired = Number(c.deadline) < now;
    const withdrawn = Boolean(c.withdrawn);
    const hasBackers = Number(c.contributorsCount ?? 0) > 0;

    // Signal A: explicit withdrawal flag (non-milestone campaigns)
    if (funded && withdrawn) return "completed";

    // Signal B: raisedAmount is 0 but contributors exist
    // → all milestone funds have been released (each withdrawal decremented raisedAmount)
    if (raisedBig === 0n && hasBackers) return "completed";

    // Signal C: funded but not yet released
    if (funded && !withdrawn) return "funded_pending";

    // Signal D: deadline passed, goal not met
    if (expired && !funded) return "expired";

    // Signal E: live and accepting contributions
    return "active";
  };

  const processedCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return campaigns
      .filter((c) => {
        const bucket = classify(c);
        if (activeTab === "active" && bucket !== "active") return false;
        if (activeTab === "completed" && bucket !== "completed") return false;
        // "all" shows everything

        const q = searchTerm.toLowerCase();
        if (q) {
          const matchTitle = c.title?.toLowerCase().includes(q);
          const matchDesc = c.description?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => {
        switch (sortBy) {
          case "newest": return Number(b.createdAt) - Number(a.createdAt);
          case "ending": {
            const aL = Number(a.deadline) - now;
            const bL = Number(b.deadline) - now;
            if (aL <= 0 && bL <= 0) return 0;
            if (aL <= 0) return 1;
            if (bL <= 0) return -1;
            return aL - bL;
          }
          case "funded": return Number(b.raisedAmount) - Number(a.raisedAmount);
          case "popular": return Number(b.contributorsCount) - Number(a.contributorsCount);
          default: return 0;
        }
      });
  }, [campaigns, activeTab, searchTerm, sortBy]);

  // Counts for tab badges — derived from the filtered array only (no raw campaignCounter)
  const counts = useMemo(() => {
    if (!campaigns) return { active: 0, completed: 0, all: 0 };
    return campaigns.reduce((acc, c) => {
      const b = classify(c);
      if (b === "active") acc.active += 1;
      if (b === "completed") acc.completed += 1;
      acc.all += 1;
      return acc;
    }, { active: 0, completed: 0, all: 0 });
  }, [campaigns]);

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white">All Campaigns</h1>
            <p className="text-gray-600 dark:text-gray-400">Discover and support projects on EthosFund</p>
          </div>
          <div className="flex items-center space-x-2">
            {[["grid", FiGrid, "Grid view"], ["list", FiList, "List view"]].map(([mode, Icon, title]) => (
              <button key={mode} onClick={() => setViewMode(mode)} title={title}
                className={`p-2 rounded-lg transition-colors ${viewMode === mode
                  ? "bg-secondary-500 text-white shadow-emerald-glow"
                  : "bg-emerald-100 dark:bg-primary-700 text-emerald-700 dark:text-gray-400 hover:bg-emerald-200 dark:hover:bg-primary-600"
                  }`}>
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-primary-800 rounded-xl shadow-sm border border-emerald-100 dark:border-primary-700">
          <div className="flex border-b border-emerald-100 dark:border-primary-700">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count = counts[tab.key] ?? 0;
              const isSel = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${isSel
                    ? "border-secondary-500 text-secondary-600 dark:text-secondary-400 bg-secondary-50/50 dark:bg-secondary-900/10"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-emerald-50 dark:hover:bg-primary-700/50"
                    }`}>
                  <Icon className="w-4 h-4" />
                  <span className="hidden xs:inline">{tab.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isSel ? "bg-secondary-500 text-white" : "bg-emerald-100 dark:bg-primary-600 text-emerald-700 dark:text-gray-300"
                    }`}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="px-6 py-2 text-xs text-slate-500 dark:text-gray-400">
            {TABS.find((t) => t.key === activeTab)?.desc}
          </div>
        </div>

        {/* Search & Sort */}
        <div className="bg-white dark:bg-primary-800 rounded-xl shadow-lg p-6 border border-emerald-100 dark:border-primary-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Search campaigns..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-emerald-200 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none bg-white dark:bg-primary-700 dark:text-white text-gray-900"
              />
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-emerald-200 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 outline-none bg-white dark:bg-primary-700 dark:text-white text-gray-900">
              <option value="newest">Newest First</option>
              <option value="ending">Ending Soon</option>
              <option value="funded">Most Funded</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-primary-800 rounded-xl shadow-lg p-6 animate-pulse border border-emerald-100 dark:border-primary-700">
                  <div className="h-48 bg-emerald-100 dark:bg-primary-700 rounded-lg mb-4" />
                  <div className="h-4 bg-emerald-100 dark:bg-primary-700 rounded mb-2" />
                  <div className="h-4 bg-slate-200 dark:bg-primary-700 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : processedCampaigns.length > 0 ? (
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
              : "space-y-4"
            }>
              {processedCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign}
                  className={viewMode === "list" ? "flex-row" : ""} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-primary-800 rounded-xl border border-emerald-100 dark:border-primary-700">
              <FiSearch className="w-16 h-16 text-emerald-200 dark:text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold font-display text-slate-900 dark:text-white mb-2">
                {searchTerm ? "No matching campaigns" : `No ${activeTab} campaigns`}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchTerm
                  ? "Try adjusting your search term."
                  : activeTab === "active"
                    ? "No campaigns are currently accepting contributions. Check the All tab!"
                    : activeTab === "completed"
                      ? "No campaigns have completed their full funding cycle yet."
                      : "No campaigns found."}
              </p>
              {searchTerm && (
                <button onClick={() => setSearchTerm("")}
                  className="mt-4 text-secondary-600 dark:text-secondary-400 text-sm font-semibold hover:underline">
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
