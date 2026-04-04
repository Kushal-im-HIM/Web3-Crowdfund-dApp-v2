/**
 * components/Dashboard/DashboardStats.js
 *
 * MANDATE 2 — Dashboard Data Audit:
 *   - All stats are computed from live on-chain data (useContractStats +
 *     useActiveCampaigns). No hardcoded values.
 *   - Fake trend percentages (+12%, +8.2%, etc.) REMOVED. Trend badges are
 *     only shown if a real delta can be computed; otherwise omitted entirely.
 *   - "Success Rate" metric was static (was showing a meaningless percentage).
 *     Replaced with "Total Backers" — the sum of contributorsCount across all
 *     campaigns, which is a real on-chain value.
 *   - "Platform Fees" stat is kept — it reads totalFeesCollected from the
 *     contract's getContractStats() which is always accurate.
 */

import { useContract } from "../../hooks/useContract";
import { formatEther, formatNumber } from "../../utils/helpers";
import { StatsCard } from "./StatsCard";
import {
  FiDollarSign,
  FiTrendingUp,
  FiUsers,
  FiTarget,
  FiActivity,
  FiAward,
} from "react-icons/fi";

export default function DashboardStats() {
  const { useContractStats, useActiveCampaigns } = useContract();
  const { data: contractStats } = useContractStats();
  const { data: campaigns } = useActiveCampaigns(0, 100);

  // ── Safe coercion helpers ─────────────────────────────────────────────────
  const safeNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "string") return parseFloat(value) || 0;
    if (typeof value === "number") return value;
    return 0;
  };

  // ── Derived on-chain metrics ──────────────────────────────────────────────

  const totalRaised =
    campaigns?.reduce((sum, campaign) => {
      try {
        const ethValue = parseFloat(formatEther(campaign?.raisedAmount || 0));
        return sum + (isNaN(ethValue) ? 0 : ethValue);
      } catch {
        return sum;
      }
    }, 0) ?? 0;

  // MANDATE 2: successfulCampaigns = those where raisedAmount >= targetAmount
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

  // MANDATE 2: "Total Backers" replaces the fake "Success Rate".
  // Sum of contributorsCount across all campaigns — genuinely on-chain.
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
        const funded =
          parseFloat(formatEther(campaign?.raisedAmount || 0)) >=
          parseFloat(formatEther(campaign?.targetAmount || 1));
        return Boolean(campaign?.active) && !funded;
      } catch {
        return false;
      }
    }).length ?? 0;

  // Safely format contract stats
  const totalCampaignsCount = safeNumber(contractStats?.totalCampaigns);
  const totalFeesAmount = contractStats?.totalFees || 0;

  // ── Stats array — no fake trend values ───────────────────────────────────
  const stats = [
    {
      title: "Total Campaigns",
      value: totalCampaignsCount.toString(),
      icon: FiTarget,
      color: "primary",
      // No trend — we can't compute a delta from on-chain data alone
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
      // MANDATE 2: Real on-chain metric — sum of contributorsCount per campaign
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
