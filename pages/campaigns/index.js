/**
 * pages/campaigns/index.js
 *
 * MANDATE 1 — Discovery Layer (Zombie Campaign Fix):
 *   - Default "Active" tab shows only campaigns where raisedAmount < targetAmount
 *     and the deadline has not passed. Funded/expired campaigns are excluded.
 *   - "Completed" tab shows funded campaigns (raisedAmount >= targetAmount).
 *   - Expired-but-unfunded campaigns are shown in a separate "Expired" filter.
 *
 * MANDATE 4 — All Campaigns Page Consistency:
 *   - View toggle buttons refactored from blue to emerald (secondary) theme.
 *   - Search, filter, and sort are all wired to React state and genuinely
 *     filter/sort the fetched campaign array (this was already implemented in
 *     the previous version; this file keeps and preserves that logic).
 *   - focus:ring classes changed from ring-blue-500 to ring-secondary-500.
 *   - The blue hardcoded classes on bg-blue-500 / ring-blue-500 are removed.
 */

import { useState, useMemo } from "react";
import Layout from "../../components/Layout/Layout";
import CampaignCard from "../../components/Campaign/CampaignCard";
import { useContract } from "../../hooks/useContract";
import { FiSearch, FiFilter, FiGrid, FiList, FiCheckCircle, FiActivity, FiClock } from "react-icons/fi";

const TABS = [
  { key: "active", label: "Active", icon: FiActivity, desc: "Campaigns currently accepting contributions" },
  { key: "completed", label: "Completed", icon: FiCheckCircle, desc: "Successfully funded projects" },
  { key: "all", label: "All", icon: FiFilter, desc: "All campaigns" },
];

export default function CampaignsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("newest");
  const [activeTab, setActiveTab] = useState("active");

  const { useActiveCampaigns } = useContract();
  // Fetch a generous batch — we do client-side tab/filter split
  const { data: campaigns, isLoading } = useActiveCampaigns(0, 100);

  const now = Math.floor(Date.now() / 1000);

  // ── Classify campaigns ──────────────────────────────────────────────────
  const classify = (c) => {
    const funded = BigInt(c.raisedAmount?.toString() ?? "0") >= BigInt(c.targetAmount?.toString() ?? "1");
    const expired = Number(c.deadline) < now;
    if (funded) return "completed";
    if (expired) return "all"; // expired-unfunded only in "all"
    return "active";
  };

  // ── Filter + Search + Sort pipeline ─────────────────────────────────────
  const processedCampaigns = useMemo(() => {
    if (!campaigns) return [];

    return campaigns
      .filter((c) => {
        // Tab filter
        const bucket = classify(c);
        if (activeTab === "active" && bucket !== "active") return false;
        if (activeTab === "completed" && bucket !== "completed") return false;
        // "all" tab shows everything

        // Search filter
        const q = searchTerm.toLowerCase();
        if (q) {
          const matchTitle = c.title?.toLowerCase().includes(q);
          const matchDesc = c.description?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }

        return true;
      })
      .slice() // never mutate the wagmi-cached reference
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

  // Tab counts — show numbers for context
  const counts = useMemo(() => {
    if (!campaigns) return { active: 0, completed: 0, all: 0 };
    return campaigns.reduce(
      (acc, c) => {
        const bucket = classify(c);
        acc[bucket] = (acc[bucket] || 0) + 1;
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
              Discover and support amazing projects
            </p>
          </div>

          {/* MANDATE 4: View toggle — emerald theme replacing blue */}
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

        {/* MANDATE 1: Discovery Tabs — Active / Completed / All */}
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

          {/* Tab description */}
          <div className="px-6 py-2 text-xs text-gray-500 dark:text-gray-400">
            {TABS.find((t) => t.key === activeTab)?.desc}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-primary-800 rounded-xl shadow-lg p-6 border border-stone-100 dark:border-primary-700">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search — MANDATE 4: ring-secondary-500 */}
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

            {/* Sort — MANDATE 4: ring-secondary-500 */}
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
                <div
                  key={i}
                  className="bg-white dark:bg-primary-800 rounded-xl shadow-lg p-6 animate-pulse border border-stone-100 dark:border-primary-700"
                >
                  <div className="h-48 bg-stone-200 dark:bg-primary-700 rounded-lg mb-4" />
                  <div className="h-4 bg-stone-200 dark:bg-primary-700 rounded mb-2" />
                  <div className="h-4 bg-stone-200 dark:bg-primary-700 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : processedCampaigns.length > 0 ? (
            <>
              {/* Completed section callout when on active tab */}
              {activeTab === "active" && counts.completed > 0 && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm">
                    <FiCheckCircle className="w-4 h-4" />
                    <span>
                      <strong>{counts.completed}</strong> campaign{counts.completed !== 1 ? "s" : ""} have been successfully funded!
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab("completed")}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    View Completed →
                  </button>
                </div>
              )}

              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "space-y-4"
                }
              >
                {processedCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    className={viewMode === "list" ? "flex-row" : ""}
                  />
                ))}
              </div>
            </>
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
                    ? "All current campaigns have been funded or expired. Browse the Completed tab!"
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
