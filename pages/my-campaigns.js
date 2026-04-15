/**
 * pages/my-campaigns.js — FIXED
 *
 * Bugs fixed:
 *  1. Duplicate CampaignCard import removed (compile error)
 *  2. Watchlist tab now actually renders — added activeTab conditional
 *     and fetches allCampaigns so bookmarked IDs can be resolved to real data
 *  3. Added useActiveCampaigns to supply allCampaigns for watchlist filtering
 */

import { useAccount, useContractReads } from "wagmi";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import Layout from "../components/Layout/Layout";
import RouteGuard from "../components/RouteGuard";
import CampaignCard from "../components/Campaign/CampaignCard";
import { useContract } from "../hooks/useContract";
import { useCampaignBookmarks } from "../hooks/useCampaignBookmarks";
import { useNetworkContracts } from "../hooks/useNetworkContracts";
import { FiPlus, FiTarget, FiTrendingUp, FiUsers, FiHeart, FiBookmark } from "react-icons/fi";
import { formatEther, calculateProgress } from "../utils/helpers";
import { CROWDFUNDING_ABI } from "../constants/abi";

export default function MyCampaignsPage() {
  const { address } = useAccount();
  const router = useRouter();
  const { useUserCampaigns, useActiveCampaigns } = useContract();
  const { bookmarks, isBookmarked } = useCampaignBookmarks();
  const [activeTab, setActiveTab] = useState("mine");
  const { contractAddress: CONTRACT_ADDRESS } = useNetworkContracts();

  // ── My Campaigns (creator) ────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState([]);
  const { data: campaignIds, isLoading: loadingIds } = useUserCampaigns(address);

  const campaignContracts = useMemo(() => {
    if (!campaignIds || campaignIds.length === 0 || !CONTRACT_ADDRESS) return [];
    return campaignIds.map((id) => ({
      address: CONTRACT_ADDRESS,
      abi: CROWDFUNDING_ABI,
      functionName: "getCampaign",
      args: [typeof id === "bigint" ? Number(id) : Number(id.toString())],
    }));
  }, [campaignIds, CONTRACT_ADDRESS]);

  const { data: campaignsData, isLoading: loadingCampaigns } = useContractReads({
    contracts: campaignContracts,
    enabled: campaignContracts.length > 0,
    watch: true,
  });

  useEffect(() => {
    if (campaignsData && campaignIds) {
      const formatted = campaignsData
        .map((result, index) => {
          if (result.status === "success" && result.result) {
            const d = result.result;
            const safeBN = (v) => {
              if (!v) return 0n;
              if (typeof v === "bigint") return v;
              return BigInt(v.toString());
            };
            const safeNum = (v) => {
              if (!v) return 0;
              if (typeof v === "bigint") return Number(v);
              return Number(v.toString());
            };
            return {
              id: safeNum(d.id || campaignIds[index]),
              creator: d.creator,
              title: d.title,
              description: d.description,
              metadataHash: d.metadataHash,
              targetAmount: safeBN(d.targetAmount),
              raisedAmount: safeBN(d.raisedAmount),
              deadline: safeNum(d.deadline),
              withdrawn: d.withdrawn,
              active: d.active,
              createdAt: safeNum(d.createdAt),
              contributorsCount: safeNum(d.contributorsCount),
            };
          }
          return null;
        })
        .filter(Boolean);
      setCampaigns(formatted);
    } else if (campaignIds && campaignIds.length === 0) {
      setCampaigns([]);
    }
  }, [campaignsData, campaignIds]);

  // ── Watchlist — BUG 2+3 FIX ──────────────────────────────────────────────
  // Fetch all campaigns so we can filter by bookmarked IDs
  const { data: allCampaigns, isLoading: loadingAll } = useActiveCampaigns(0, 100);

  const watchlistCampaigns = useMemo(() => {
    if (!allCampaigns || bookmarks.size === 0) return [];
    return allCampaigns.filter((c) => isBookmarked(c.id));
  }, [allCampaigns, bookmarks, isBookmarked]);

  // ── Stats (derived from My Campaigns) ────────────────────────────────────
  const loading = loadingIds || loadingCampaigns;

  const totalRaised = campaigns.reduce(
    (sum, c) => sum + parseFloat(formatEther(c.raisedAmount || 0)), 0
  );
  const successfulCampaigns = campaigns.filter(
    (c) => calculateProgress(c.raisedAmount, c.targetAmount) >= 100
  ).length;
  const activeCampaigns = campaigns.filter(
    (c) => c.active && new Date(c.deadline * 1000) > new Date()
  ).length;

  return (
    <RouteGuard>
      <Layout>
        <div className="space-y-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white mb-1">
                My Campaigns
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your campaigns and track your watchlist
              </p>
            </div>
            <button
              onClick={() => router.push("/create-campaign")}
              className="bg-gradient-emerald hover:shadow-emerald-glow text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 inline-flex items-center flex-shrink-0"
            >
              <FiPlus className="w-5 h-5 mr-2" />
              Create Campaign
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("mine")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "mine"
                  ? "bg-emerald-500 text-white shadow-emerald-glow"
                  : "bg-white dark:bg-primary-800 text-slate-600 dark:text-slate-300 border border-emerald-100 dark:border-primary-700 hover:bg-emerald-50 dark:hover:bg-primary-700"
                }`}
            >
              <FiTarget className="w-4 h-4" />
              My Campaigns
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "mine" ? "bg-white/20" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                }`}>
                {campaigns.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("watchlist")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "watchlist"
                  ? "bg-red-500 text-white shadow-sm"
                  : "bg-white dark:bg-primary-800 text-slate-600 dark:text-slate-300 border border-emerald-100 dark:border-primary-700 hover:bg-red-50 dark:hover:bg-primary-700"
                }`}
            >
              <FiHeart className="w-4 h-4" />
              Watchlist
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "watchlist"
                  ? "bg-white/20"
                  : bookmarks.size > 0
                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    : "bg-slate-100 dark:bg-primary-700 text-slate-500"
                }`}>
                {bookmarks.size}
              </span>
            </button>
          </div>

          {/* ── MY CAMPAIGNS TAB ──────────────────────────────────────────── */}
          {activeTab === "mine" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[
                  { label: "Total Campaigns", value: campaigns.length, icon: FiTarget, color: "secondary" },
                  { label: "Total Raised", value: `${totalRaised.toFixed(3)} ETH`, icon: FiTrendingUp, color: "tertiary" },
                  { label: "Active", value: activeCampaigns, icon: FiUsers, color: "accent" },
                  { label: "Successful", value: successfulCampaigns, icon: FiTarget, color: "secondary" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white dark:bg-primary-800 rounded-xl p-5 border border-emerald-100 dark:border-primary-700 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">{label}</p>
                        <p className="text-2xl font-bold font-display text-gray-900 dark:text-white mt-0.5">{value}</p>
                      </div>
                      <div className={`w-11 h-11 bg-${color}-50 dark:bg-${color}-900/20 rounded-xl flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Campaigns grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-primary-800 rounded-xl border border-emerald-100 dark:border-primary-700 animate-pulse">
                      <div className="h-48 bg-emerald-100 dark:bg-primary-700 rounded-t-xl" />
                      <div className="p-5 space-y-3">
                        <div className="h-4 bg-emerald-100 dark:bg-primary-700 rounded w-3/4" />
                        <div className="h-3 bg-emerald-100 dark:bg-primary-700 rounded w-full" />
                        <div className="h-2 bg-emerald-100 dark:bg-primary-700 rounded-full w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : campaigns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campaigns.map((campaign) => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white dark:bg-primary-800 rounded-xl border border-dashed border-emerald-200 dark:border-primary-700">
                  <FiTarget className="w-16 h-16 text-emerald-200 dark:text-primary-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-2">
                    No campaigns yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Create your first campaign to start crowdfunding.
                  </p>
                  <button
                    onClick={() => router.push("/create-campaign")}
                    className="bg-gradient-emerald hover:shadow-emerald-glow text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 inline-flex items-center"
                  >
                    <FiPlus className="w-5 h-5 mr-2" />
                    Create Your First Campaign
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── WATCHLIST TAB — BUG 2 FIXED ───────────────────────────────── */}
          {activeTab === "watchlist" && (
            <>
              {loadingAll ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-primary-800 rounded-xl border border-emerald-100 dark:border-primary-700 animate-pulse">
                      <div className="h-48 bg-emerald-100 dark:bg-primary-700 rounded-t-xl" />
                      <div className="p-5 space-y-3">
                        <div className="h-4 bg-emerald-100 dark:bg-primary-700 rounded w-3/4" />
                        <div className="h-3 bg-emerald-100 dark:bg-primary-700 rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : watchlistCampaigns.length > 0 ? (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {watchlistCampaigns.length} saved campaign{watchlistCampaigns.length !== 1 ? "s" : ""} · Click the ♥ on any card to remove
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {watchlistCampaigns.map((campaign) => (
                      <CampaignCard key={campaign.id} campaign={campaign} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 bg-white dark:bg-primary-800 rounded-xl border border-dashed border-red-200 dark:border-primary-700">
                  <FiHeart className="w-16 h-16 text-red-200 dark:text-primary-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-2">
                    Your watchlist is empty
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Tap the ♥ on any campaign card to save it here.
                  </p>
                  <button
                    onClick={() => router.push("/campaigns")}
                    className="bg-white dark:bg-primary-800 border border-emerald-200 dark:border-primary-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Browse Campaigns
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </Layout>
    </RouteGuard>
  );
}
