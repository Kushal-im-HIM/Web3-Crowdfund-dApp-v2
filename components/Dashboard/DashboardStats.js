/**
 * components/Dashboard/DashboardStats.js
 *
 * FIX Issue 4 — Ghost Campaign Counter:
 *   The previous version used `contractStats?.totalCampaigns` (which maps to
 *   `campaignCounter` on-chain) for the "Total Campaigns" stat. This counter
 *   never decrements — it includes all campaigns ever created, including the
 *   3 that the admin deactivated. So it would show "8" even though only 5
 *   are visible.
 *
 *   The fix: "Total Campaigns" now equals `campaigns?.length` — the count of
 *   campaigns actually returned by `getActiveCampaigns()`, which the contract
 *   already filters to `campaigns[i].active == true`. Deactivated entries are
 *   never included in this array, so the stat matches exactly what the user sees.
 *
 *   The raw `campaignCounter` (getContractStats) is retained for "Platform Fees"
 *   which is the only stat that correctly comes from that source.
 */

import { useContract } from "../../hooks/useContract";
import { formatEther, formatNumber } from "../../utils/helpers";
import { StatsCard } from "./StatsCard";
import {
  FiDollarSign, FiTrendingUp, FiUsers,
  FiTarget, FiActivity, FiAward,
} from "react-icons/fi";

export default function DashboardStats() {
  const { useContractStats, useActiveCampaigns } = useContract();
  const { data: contractStats } = useContractStats();
  const { data: campaigns } = useActiveCampaigns(0, 100);

  const safeNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "string") return parseFloat(value) || 0;
    if (typeof value === "number") return value;
    return 0;
  };

  const totalRaised =
    campaigns?.reduce((sum, campaign) => {
      try {
        const ethValue = parseFloat(formatEther(campaign?.raisedAmount || 0));
        return sum + (isNaN(ethValue) ? 0 : ethValue);
      } catch {
        return sum;
      }
    }, 0) ?? 0;

  const successfulCampaigns =
    campaigns?.filter((campaign) => {
      try {
        const raised = parseFloat(formatEther(campaign?.raisedAmount || 0));
        const target = parseFloat(formatEther(campaign?.targetAmount || 0));
        return !isNaN(raised) && !isNaN(target) && target > 0 && raised >= target;
      } catch {
        return false;
      }
    }).length ?? 0;

  const totalBackers =
    campaigns?.reduce((sum, campaign) => {
      try {
        return sum + safeNumber(campaign?.contributorsCount);
      } catch {
        return sum;
      }
    }, 0) ?? 0;

  const activeCampaigns =
    campaigns?.filter((campaign) => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const funded =
          parseFloat(formatEther(campaign?.raisedAmount || 0)) >=
          parseFloat(formatEther(campaign?.targetAmount || 1));
        const expired = Number(campaign?.deadline) < now;
        return Boolean(campaign?.active) && !funded && !expired;
      } catch {
        return false;
      }
    }).length ?? 0;

  // FIX Issue 4: use campaigns.length (only active/non-deactivated campaigns)
  // NOT contractStats.totalCampaigns (which is the raw campaignCounter that
  // includes deactivated entries and never decrements).
  const totalCampaignsCount = campaigns?.length ?? 0;

  const totalFeesAmount = contractStats?.totalFees || 0;

  const stats = [
    {
      title: "Total Campaigns",
      value: totalCampaignsCount.toString(),
      icon: FiTarget,
      color: "primary",
      // Subtitle clarifies this is the live, deactivation-aware count
      subtitle: "Active (non-deactivated)",
    },
    {
      title: "Total Raised",
      value: `${totalRaised.toFixed(2)} ETH`,
      icon: FiDollarSign,
      color: "secondary",
    },
    {
      title: "Active Campaigns",
      value: activeCampaigns.toString(),
      icon: FiActivity,
      color: "tertiary",
    },
    {
      title: "Total Backers",
      value: formatNumber(totalBackers),
      icon: FiUsers,
      color: "accent",
    },
    {
      title: "Successful Campaigns",
      value: successfulCampaigns.toString(),
      icon: FiAward,
      color: "emerald",
    },
    {
      title: "Platform Fees",
      value: `${parseFloat(formatEther(totalFeesAmount)).toFixed(4)} ETH`,
      icon: FiTrendingUp,
      color: "cyan",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
}
