/**
 * pages/campaigns/index.js
 *
 * Issue 2 — Accurate filter logic:
 *   Active    = deadline in future AND raisedAmount < targetAmount
 *   Completed = raisedAmount >= targetAmount AND campaign.withdrawn == true
 *               (for non-milestone campaigns)
 *               OR all milestones are Released/Refunded
 *               (for milestone campaigns)
 *               The key insight: "Completed" means money has actually LEFT the
 *               contract. Just being "funded" is not completed — the creator
 *               might not have withdrawn yet.
 *   All       = every non-deactivated campaign (getActiveCampaigns already
 *               filters active==true, so deactivated ones never appear).
 *
 *   Rejected tab REMOVED per Issue 2. Failed/expired campaigns that didn't
 *   meet their goal are visible in the "All" tab for transparency but don't
 *   get their own filter — they are an implementation detail, not a
 *   user-facing category that helps people find campaigns to back.
 *
 * Issue 3 — URL query param persistence:
 *   Active tab is read from and written to ?filter=<tab> via Next.js router.
 *   Pressing Back from a campaign detail page restores the exact filter.
 */

import { useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout/Layout";
import CampaignCard from "../../components/Campaign/CampaignCard";
import { useContract } from "../../hooks/useContract";
import { useState } from "react";
import {
  FiSearch, FiFilter, FiGrid, FiList,
  FiCheckCircle, FiActivity,
} from "react-icons/fi";

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
    desc: "Campaigns fully funded AND where funds have been released to the creator",
  },
  {
    key: "all",
    label: "All",
    icon: FiFilter,
    desc: "Every campaign visible on EthosFund (excludes admin-deactivated campaigns)",
  },
];

const VALID_FILTERS = TABS.map((t) => t.key);
const DEFAULT_FILTER = "active";

export default function CampaignsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("newest");

  // Issue 3: active tab driven by URL query param
  const filterFromUrl = router.query.filter;
  const activeTab = VALID_FILTERS.includes(filterFromUrl) ? filterFromUrl : DEFAULT_FILTER;

  const setActiveTab = (tab) => {
    router.push({ pathname: router.pathname, query: { filter: tab } }, undefined, {
      shallow: true,
    });
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
  // getActiveCampaigns already filters active==true at the contract level
  const { data: campaigns, isLoading } = useActiveCampaigns(0, 100);

  const now = Math.floor(Date.now() / 1000);

  /**
   * Issue 2 — classify():
   *
   * "completed" means funds have actually left the escrow contract.
   *   • Non-milestone campaigns: campaign.withdrawn === true
   *   • Milestone campaigns: we can't know milestone release state from
   *     getActiveCampaigns alone (it doesn't include milestone data),
   *     but campaign.withdrawn being true is the canonical signal that
   *     at least the non-milestone withdrawal happened.
   *     The simplest reliable rule without additional per-campaign calls:
   *       funded AND withdrawn == true → completed
   *       funded AND withdrawn == false → "funded" (show in All, not Completed)
   *
   * This fixes the old bug where any funded campaign (even ones where the
   * creator hadn't touched the money yet) showed in Completed.
   */
  const classify = (c) => {
    const funded =
      BigInt(c.raisedAmount?.toString() ?? "0") >=
      BigInt(c.targetAmount?.toString() ?? "1");
    const expired = Number(c.deadline) < now;

    if (funded && Boolean(c.withdrawn)) return "completed";
    // funded but not yet withdrawn — visible in All only
    if (funded && !c.withdrawn) return "funded_pending";
    // deadline passed, goal not met — visible in All only (no Rejected tab)
    if (expired && !funded) return "expired";
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
          case "newest":
            return Number(b.createdAt) - Number(a.createdAt);
          case "ending": {
            const aLeft = Number(a.deadline) - now;
            const bLeft = Number(b.deadline) - now;
            if (aLeft <= 0 && bLeft <= 0) return 0;
            if (aLeft <= 0) return 1;
            if (bLeft <= 0) return -1;
            return aLeft - bLeft;
          }
          case "funded":
            return Number(b.raisedAmount) - Number(a.raisedAmount);
          case "popular":
            return Number(b.contributorsCount) - Number(a.contributorsCount);
          default:
            return 0;
        }
      });
  }, [campaigns, activeTab, searchTerm, sortBy]);

  // Issue 2 & Issue 4: counts derived from filtered active campaigns array only
  const counts = useMemo(() => {
    if (!campaigns) return { active: 0, completed: 0, all: 0 };
    return campaigns.reduce(
      (acc, c) => {
        const bucket = classify(c);
        if (bucket === "active") acc.active += 1;
        if (bucket === "completed") acc.completed += 1;
        acc.all += 1;
        return acc;
      },
      { active: 0, completed: 0, all: 0 }
    );
  }, [campaigns]);

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              All Campaigns
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Discover and support projects on EthosFund
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "grid"
                ? "bg-secondary-500 text-white shadow-emerald-glow"
                : "bg-stone-100 dark:bg-primary-700 text-gray-600 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-primary-600"
                }`}
              title="Grid view"
            >
              <FiGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "list"
                ? "bg-secondary-500 text-white shadow-emerald-glow"
                : "bg-stone-100 dark:bg-primary-700 text-gray-600 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-primary-600"
                }`}
              title="List view"
            >
              <FiList className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-primary-800 rounded-xl shadow-lg border border-stone-100 dark:border-primary-700">
          <div className="flex border-b border-stone-200 dark:border-primary-700">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count = counts[tab.key] ?? 0;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${isActive
                      ? "border-secondary-500 text-secondary-600 dark:text-secondary-400 bg-secondary-50/50 dark:bg-secondary-900/10"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-stone-50 dark:hover:bg-primary-700/50"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive
                      ? "bg-secondary-500 text-white"
                      : "bg-stone-200 dark:bg-primary-600 text-gray-600 dark:text-gray-300"
                    }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="px-6 py-2 text-xs text-gray-500 dark:text-gray-400">
            {TABS.find((t) => t.key === activeTab)?.desc}
          </div>
        </div>

        {/* Search & Sort */}
        <div className="bg-white dark:bg-primary-800 rounded-xl shadow-lg p-6 border border-stone-100 dark:border-primary-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none bg-white dark:bg-primary-700 dark:text-white text-gray-900"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-stone-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-secondary-500 outline-none bg-white dark:bg-primary-700 dark:text-white text-gray-900"
            >
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-primary-800 rounded-xl shadow-lg p-6 animate-pulse border border-stone-100 dark:border-primary-700">
                  <div className="h-48 bg-stone-200 dark:bg-primary-700 rounded-lg mb-4" />
                  <div className="h-4 bg-stone-200 dark:bg-primary-700 rounded mb-2" />
                  <div className="h-4 bg-stone-200 dark:bg-primary-700 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : processedCampaigns.length > 0 ? (
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
            }>
              {processedCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  className={viewMode === "list" ? "flex-row" : ""}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-primary-800 rounded-xl border border-stone-100 dark:border-primary-700">
              <FiSearch className="w-16 h-16 text-stone-300 dark:text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
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
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-4 text-secondary-600 dark:text-secondary-400 text-sm font-semibold hover:underline"
                >
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
