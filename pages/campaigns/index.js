/**
 * pages/campaigns/index.js
 *
 * V6 FILTER FIX — classify() updated for immutable raisedAmount.
 *
 * ROOT CAUSE OF THE FILTER BUG:
 *   In v5 contract, withdrawMilestoneFunds() decremented campaign.raisedAmount.
 *   Signal B in classify() relied on this: raisedAmount === 0n && hasBackers → completed.
 *   In v6 contract, raisedAmount is IMMUTABLE — it never decrements.
 *   Signal B therefore NEVER fires → Completed tab always shows 0.
 *
 * V6 FIX — new completion signals:
 *   Signal A: campaign.withdrawn === true (non-milestone campaigns — unchanged)
 *   Signal B NEW: campaignEscrow == 0n AND raisedAmount >= targetAmount
 *     The escrow drains to zero only when all milestone funds are released.
 *     Uses a batched useContractReads for all campaign escrows (one round-trip).
 *   Signal C: funded, escrow > 0 → funded_pending
 *   Signal D: deadline past, underfunded → expired
 *   Signal E: deadline in future, underfunded → active
 *
 * OTHER FIXES:
 *   - Fixed CampaignCardSkeleton import path (was "../components/" from pages/campaigns/ → wrong)
 *   - Loading state now uses CampaignCardSkeleton instead of plain pulse divs
 *   - URL ?filter= persistence unchanged
 */

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useContractReads } from "wagmi";
import Layout from "../../components/Layout/Layout";
import CampaignCard from "../../components/Campaign/CampaignCard";
import { CampaignCardSkeleton } from "../../components/SkeletonCard";
import { useContract } from "../../hooks/useContract";
import { useNetworkContracts } from "../../hooks/useNetworkContracts";
import { CROWDFUNDING_ABI } from "../../constants/abi";
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
    desc: "Campaigns fully funded AND where all milestone funds have been released to the creator",
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
  const { contractAddress: CONTRACT_ADDRESS } = useNetworkContracts();
  const { data: campaigns, isLoading } = useActiveCampaigns(0, 100);

  // ── V6 FIX: Batch-read campaignEscrow for all campaigns ──────────────────
  // Escrow starts equal to raisedAmount and drains to 0 as milestones are withdrawn.
  // When escrow == 0 AND campaign is funded → all milestone funds have been released.
  const escrowContracts = useMemo(() =>
    (campaigns || []).map((c) => ({
      address: CONTRACT_ADDRESS,
      abi: CROWDFUNDING_ABI,
      functionName: "getCampaignEscrow",
      args: [c.id],
    })),
    [campaigns, CONTRACT_ADDRESS]
  );

  const { data: escrowData } = useContractReads({
    contracts: escrowContracts,
    enabled: escrowContracts.length > 0 && Boolean(CONTRACT_ADDRESS),
    watch: true,
  });

  // Map campaignId → escrow BigInt (null while loading)
  const escrowMap = useMemo(() => {
    if (!campaigns || !escrowData) return {};
    return campaigns.reduce((map, c, i) => {
      const result = escrowData[i];
      map[String(c.id)] =
        result?.status === "success"
          ? BigInt(result.result?.toString() ?? "0")
          : null;
      return map;
    }, {});
  }, [campaigns, escrowData]);

  const now = Math.floor(Date.now() / 1000);

  /**
   * classify() — categorise a campaign.
   *
   * "completed"      → all funds have left the contract
   * "funded_pending" → funded but funds not yet fully released
   * "active"         → accepting contributions
   * "expired"        → deadline past, goal not met
   */
  const classify = (c) => {
    const raisedBig = BigInt(c.raisedAmount?.toString() ?? "0");
    const targetBig = BigInt(c.targetAmount?.toString() ?? "1");
    const funded = raisedBig >= targetBig;
    const expired = Number(c.deadline) < now;
    const withdrawn = Boolean(c.withdrawn);
    const escrow = escrowMap[String(c.id)];

    // Signal A: explicit withdrawal flag (non-milestone campaigns)
    if (funded && withdrawn) return "completed";

    // Signal B (V6): escrow drained to zero → all milestone funds released
    // null escrow means data not yet loaded → conservative fallback to funded_pending
    if (funded && escrow === 0n) return "completed";

    // Signal C: funded but funds still in escrow
    if (funded && !withdrawn) return "funded_pending";

    // Signal D: deadline past, goal not met
    if (expired && !funded) return "expired";

    // Signal E: live, accepting contributions
    return "active";
  };

  const processedCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return campaigns
      .filter((c) => {
        const bucket = classify(c);
        if (activeTab === "active" && bucket !== "active") return false;
        if (activeTab === "completed" && bucket !== "completed") return false;

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
  }, [campaigns, activeTab, searchTerm, sortBy, escrowMap]);

  const counts = useMemo(() => {
    if (!campaigns) return { active: 0, completed: 0, all: 0 };
    return campaigns.reduce((acc, c) => {
      const b = classify(c);
      if (b === "active") acc.active += 1;
      if (b === "completed") acc.completed += 1;
      acc.all += 1;
      return acc;
    }, { active: 0, completed: 0, all: 0 });
  }, [campaigns, escrowMap]);

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
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isSel
                      ? "bg-secondary-500 text-white"
                      : "bg-emerald-100 dark:bg-primary-600 text-emerald-700 dark:text-gray-300"
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
        <div className="bg-white dark:bg-primary-800 rounded-xl shadow-sm p-5 border border-emerald-100 dark:border-primary-700">
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
              {[...Array(6)].map((_, i) => <CampaignCardSkeleton key={i} />)}
            </div>
          ) : processedCampaigns.length > 0 ? (
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
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
