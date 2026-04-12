/**
 * components/Dashboard/DashboardStats.js
 *
 * Issue 1 — Platform fee renamed to "Anti-Spam Deposits" throughout.
 *   EthosFund charges 0% platform fee. The only on-chain fee collected is the
 *   0.0001 ETH anti-spam deposit required at campaign creation. Calling it a
 *   "Platform Fee" contradicts the 0% fee marketing, so the stat is relabelled.
 *
 * Issue 4 — "Total Campaigns" uses campaigns.length (active, non-deactivated)
 *   not the raw campaignCounter which never decrements.
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
      } catch { return sum; }
    }, 0) ?? 0;

  const successfulCampaigns =
    campaigns?.filter((campaign) => {
      try {
        const raised = parseFloat(formatEther(campaign?.raisedAmount || 0));
        const target = parseFloat(formatEther(campaign?.targetAmount || 0));
        return !isNaN(raised) && !isNaN(target) && target > 0 && raised >= target;
      } catch { return false; }
    }).length ?? 0;

  const totalBackers =
    campaigns?.reduce((sum, campaign) => {
      try { return sum + safeNumber(campaign?.contributorsCount); }
      catch { return sum; }
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
      } catch { return false; }
    }).length ?? 0;

  // Issue 4: campaigns.length (already filtered to active==true by contract)
  const totalCampaignsCount = campaigns?.length ?? 0;

  // Issue 1: renamed from "Platform Fees" — totalFeesCollected is the
  // sum of 0.0001 ETH anti-spam deposits, NOT a percentage fee.
  const totalDepositsAmount = contractStats?.totalFees || 0;

  const stats = [
    {
      title: "Total Campaigns",
      value: totalCampaignsCount.toString(),
      icon: FiTarget,
      color: "primary",
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
      // Issue 1: renamed — 0.0001 ETH anti-spam deposits, not platform revenue
      title: "Anti-Spam Deposits",
      value: `${parseFloat(formatEther(totalDepositsAmount)).toFixed(4)} ETH`,
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
