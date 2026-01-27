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
  const { useContractStats, useActiveCampaigns, address } = useContract();
  const { data: contractStats } = useContractStats();
  const { data: campaigns } = useActiveCampaigns(0, 100);

  // Helper function to safely convert values to numbers
  const safeNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "string") return parseFloat(value) || 0;
    if (typeof value === "number") return value;
    return 0;
  };

  // Calculate additional stats with proper error handling
  const totalRaised =
    campaigns?.reduce((sum, campaign) => {
      try {
        const raisedAmount = campaign?.raisedAmount || 0;
        const ethValue = parseFloat(formatEther(raisedAmount));
        return sum + (isNaN(ethValue) ? 0 : ethValue);
      } catch (error) {
        console.warn("Error calculating raised amount:", error);
        return sum;
      }
    }, 0) || 0;

  const successfulCampaigns =
    campaigns?.filter((campaign) => {
      try {
        const raisedAmount = campaign?.raisedAmount || 0;
        const targetAmount = campaign?.targetAmount || 0;
        const raised = parseFloat(formatEther(raisedAmount));
        const target = parseFloat(formatEther(targetAmount));
        return !isNaN(raised) && !isNaN(target) && raised >= target;
      } catch (error) {
        console.warn("Error checking campaign success:", error);
        return false;
      }
    }).length || 0;

  const totalContributors =
    campaigns?.reduce((sum, campaign) => {
      try {
        const contributorsCount = safeNumber(campaign?.contributorsCount);
        return sum + contributorsCount;
      } catch (error) {
        console.warn("Error calculating contributors:", error);
        return sum;
      }
    }, 0) || 0;

  const activeCampaigns =
    campaigns?.filter((campaign) => {
      try {
        return Boolean(campaign?.active);
      } catch (error) {
        console.warn("Error checking campaign active status:", error);
        return false;
      }
    }).length || 0;

  // Safely format contract stats
  const totalCampaignsCount = safeNumber(contractStats?.totalCampaigns);
  const totalFeesAmount = contractStats?.totalFees || 0;

  const stats = [
    {
      title: "Total Campaigns",
      value: totalCampaignsCount.toString(),
      icon: FiTarget,
      color: "blue",
      trend: "up",
      trendValue: "+12%",
    },
    {
      title: "Total Raised",
      value: `${totalRaised.toFixed(2)} ETH`,
      icon: FiDollarSign,
      color: "green",
      trend: "up",
      trendValue: "+8.2%",
    },
    {
      title: "Active Campaigns",
      value: activeCampaigns.toString(),
      icon: FiActivity,
      color: "purple",
      trend: "up",
      trendValue: "+5.1%",
    },
    {
      title: "Total Contributors",
      value: formatNumber(totalContributors),
      icon: FiUsers,
      color: "orange",
      trend: "up",
      trendValue: "+15.3%",
    },
    {
      title: "Successful Campaigns",
      value: successfulCampaigns.toString(),
      icon: FiAward,
      color: "pink",
      trend: "up",
      trendValue: "+3.7%",
    },
    {
      title: "Platform Fees",
      value: `${parseFloat(formatEther(totalFeesAmount)).toFixed(4)} ETH`,
      icon: FiTrendingUp,
      color: "indigo",
      trend: "up",
      trendValue: "+9.1%",
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
