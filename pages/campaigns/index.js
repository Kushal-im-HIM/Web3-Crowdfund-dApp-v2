/**
 * pages/campaigns/index.js
 *
 * FIX Issue 2 — Campaign Filtering & Status Logic:
 *   Active    → deadline not passed AND raisedAmount < targetAmount
 *   Funded    → raisedAmount >= targetAmount AND withdrawn == false  (awaiting creator action)
 *   Completed → raisedAmount >= targetAmount AND withdrawn == true   (fully closed)
 *   Rejected  → deadline passed AND raisedAmount < targetAmount      (failed campaigns)
 *   All       → every non-deactivated campaign (getActiveCampaigns already excludes
 *               deactivated ones — see Ghost Counter fix below)
 *
 *   "Funded" campaigns (hit goal but not yet withdrawn) now appear in the
 *   "All" tab and also trigger an info banner on the "Active" tab so backers
 *   can see the campaign succeeded — they are NOT falsely shown as "Active".
 *
 * FIX Issue 2 (invalid routes) — handled in pages/404.js (separate file).
 *
 * FIX Issue 3 — Persistent Routing State:
 *   The active tab is read from and written to the URL query parameter
 *   `?filter=<tab>` via Next.js useRouter. Clicking "Back" from a detail
 *   page restores the browser history entry that includes the filter query,
 *   so the user lands on exactly the tab they left.
 *
 * FIX Issue 4 — Ghost Campaign Counter:
 *   `getActiveCampaigns()` in the Solidity contract already filters by
 *   `campaigns[i].active == true`, so deactivated campaigns are NEVER
 *   returned to the frontend. The "All" tab count is derived from this
 *   filtered array — it never inflates to include admin-deactivated entries.
 *   (The raw `campaignCounter` / `getContractStats` value is NOT used here.)
 */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout/Layout";
import CampaignCard from "../../components/Campaign/CampaignCard";
import { useContract } from "../../hooks/useContract";
import {
  FiSearch, FiFilter, FiGrid, FiList,
  FiCheckCircle, FiActivity, FiClock, FiXCircle, FiDollarSign,
} from "react-icons/fi";

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  {
    key: "active",
    label: "Active",
    icon: FiActivity,
    desc: "Campaigns currently accepting contributions (deadline not reached, not yet funded)",
  },
  {
    key: "completed",
    label: "Completed",
    icon: FiCheckCircle,
    desc: "Campaigns that are fully funded AND where the creator has withdrawn funds",
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: FiXCircle,
    desc: "Campaigns whose deadline has passed without reaching their funding goal",
  },
  {
    key: "all",
    label: "All",
    icon: FiFilter,
    desc: "All campaigns (excludes admin-deactivated campaigns — those are permanently hidden)",
  },
];

const VALID_FILTERS = TABS.map((t) => t.key);
const DEFAULT_FILTER = "active";

export default function CampaignsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("newest");

  // FIX Issue 3: derive active tab from URL query param
  const filterFromUrl = router.query.filter;
  const activeTab = VALID_FILTERS.includes(filterFromUrl)
    ? filterFromUrl
    : DEFAULT_FILTER;

  const setActiveTab = (tab) => {
    router.push({ pathname: router.pathname, query: { filter: tab } }, undefined, {
      shallow: true, // no full page reload — just URL update
    });
  };

  // On first load with no filter param, set default without adding history entry
  useEffect(() => {
    if (router.isReady && !filterFromUrl) {
      router.replace(
        { pathname: router.pathname, query: { filter: DEFAULT_FILTER } },
        undefined,
        { shallow: true }
      );
    }
  }, [router.isReady, filterFromUrl]);

  // FIX Issue 4: fetch ALL active (non-deactivated) campaigns.
  // `getActiveCampaigns` in the contract loops campaigns[i].active == true,
  // so deactivated ones are never included in this response.
  const { useActiveCampaigns } = useContract();
  const { data: campaigns, isLoading } = useActiveCampaigns(0, 100);

  const now = Math.floor(Date.now() / 1000);

  // ── Classify each campaign ────────────────────────────────────────────────
  /**
   * Returns the bucket key for a campaign.
   *
   * "funded" is an intermediate state (goal reached, funds not yet withdrawn)
   * that shows in the "All" tab but not in "Active", "Completed", or "Rejected".
   * From a backer's perspective the campaign is successful but not yet "done".
   */
  const classify = (c) => {
    const funded =
      BigInt(c.raisedAmount?.toString() ?? "0") >=
      BigInt(c.targetAmount?.toString() ?? "1");
    const expired = Number(c.deadline) < now;
    const withdrawn = Boolean(c.withdrawn);

    if (funded && withdrawn) return "completed";
    if (funded && !withdrawn) return "funded"; // goal hit, pending withdrawal
    if (expired && !funded) return "rejected"; // deadline passed, underfunded
    return "active"; // deadline live, not yet funded
  };

  // ── Filter + Search + Sort pipeline ──────────────────────────────────────
  const processedCampaigns = useMemo(() => {
    if (!campaigns) return [];

    return campaigns
      .filter((c) => {
        const bucket = classify(c);

        if (activeTab === "active" && bucket !== "active") return false;
        if (activeTab === "completed" && bucket !== "completed") return false;
        if (activeTab === "rejected" && bucket !== "rejected") return false;
        // "all" shows everything — active, funded, completed, rejected

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

  // FIX Issue 4: Tab counts are derived purely from the filtered campaign array
  // (which already excludes deactivated campaigns). No raw campaignCounter used.
  const counts = useMemo(() => {
    if (!campaigns) return { active: 0, completed: 0, rejected: 0, funded: 0, all: 0 };
    return campaigns.reduce(
      (acc, c) => {
        const bucket = classify(c);
        acc[bucket] = (acc[bucket] || 0) + 1;
        acc.all += 1; // total visible (all non-deactivated)
        return acc;
      },
      { active: 0, completed: 0, rejected: 0, funded: 0, all: 0 }
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
              Discover and support amazing projects
            </p>
          </div>

          {/* View toggle */}
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

        {/* Tabs — Active / Completed / Rejected / All */}
        <div className="bg-white dark:bg-primary-800 rounded-xl shadow-lg border border-stone-100 dark:border-primary-700">
          <div className="flex border-b border-stone-200 dark:border-primary-700 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              // FIX Issue 4: count shown is derived from the filtered array
              const count = counts[tab.key] ?? 0;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-4 text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap ${isActive
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

          {/* Tab description */}
          <div className="px-6 py-2 text-xs text-gray-500 dark:text-gray-400">
            {TABS.find((t) => t.key === activeTab)?.desc}
          </div>
        </div>

        {/* Callout banners */}
        {activeTab === "active" && counts.funded > 0 && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm">
              <FiDollarSign className="w-4 h-4" />
              <span>
                <strong>{counts.funded}</strong> campaign{counts.funded !== 1 ? "s" : ""} reached their goal and
                {counts.funded !== 1 ? " are" : " is"} awaiting creator withdrawal.
              </span>
            </div>
            <button
              onClick={() => setActiveTab("all")}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View All →
            </button>
          </div>
        )}

        {activeTab === "active" && counts.completed > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
              <FiCheckCircle className="w-4 h-4 text-emerald-500" />
              <span>
                <strong>{counts.completed}</strong> campaign{counts.completed !== 1 ? "s" : ""} fully funded and closed.
              </span>
            </div>
            <button
              onClick={() => setActiveTab("completed")}
              className="text-xs font-semibold text-secondary-600 dark:text-secondary-400 hover:underline"
            >
              View Completed →
            </button>
          </div>
        )}

        {/* Filters and Search */}
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
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
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
                    ? "No campaigns are currently accepting contributions. Check the Completed or All tabs."
                    : activeTab === "rejected"
                      ? "No campaigns have failed to reach their goal. Great news!"
                      : "Check back later for updates."}
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
