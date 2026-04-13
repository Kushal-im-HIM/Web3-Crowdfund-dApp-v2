/**
 * pages/contributions.js
 *
 * FROZEN ADDRESS FIX:
 *   CONTRACT_ADDRESS was imported from constants/index.js — frozen at boot time.
 *   The useMemo building contractCalls used this stale address, so getCampaign()
 *   and getContribution() always targeted the wrong network after a chain switch.
 *   Fix: useNetworkContracts() provides the live address; added to useMemo deps.
 */

import { useAccount, useContractReads } from "wagmi";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import Layout from "../components/Layout/Layout";
import { useContract } from "../hooks/useContract";
import { useNetworkContracts } from "../hooks/useNetworkContracts";
import {
  FiHeart, FiExternalLink, FiDollarSign, FiCalendar,
} from "react-icons/fi";
import { formatEther, formatAddress, formatDate } from "../utils/helpers";
import { CROWDFUNDING_ABI } from "../constants/abi";

export default function ContributionsPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { useUserContributions } = useContract();

  // FROZEN ADDRESS FIX: live address from connected chain
  const { contractAddress: CONTRACT_ADDRESS } = useNetworkContracts();

  const [contributions, setContributions] = useState([]);

  const { data: contributionCampaignIds, isLoading: loadingIds } =
    useUserContributions(address);

  // CONTRACT_ADDRESS added to deps so calls rebuild on chain switch
  const contractCalls = useMemo(() => {
    if (!contributionCampaignIds || contributionCampaignIds.length === 0 || !address || !CONTRACT_ADDRESS)
      return [];

    const calls = [];
    contributionCampaignIds.forEach((campaignId) => {
      const numericId = typeof campaignId === "bigint"
        ? Number(campaignId)
        : Number(campaignId.toString());

      calls.push({
        address: CONTRACT_ADDRESS,
        abi: CROWDFUNDING_ABI,
        functionName: "getCampaign",
        args: [numericId],
      });
      calls.push({
        address: CONTRACT_ADDRESS,
        abi: CROWDFUNDING_ABI,
        functionName: "getContribution",
        args: [numericId, address],
      });
    });
    return calls;
  }, [contributionCampaignIds, address, CONTRACT_ADDRESS]); // ← CONTRACT_ADDRESS in deps

  const { data: contractData, isLoading: loadingData } = useContractReads({
    contracts: contractCalls,
    enabled: contractCalls.length > 0,
    watch: true,
  });

  const loading = loadingIds || loadingData;

  useEffect(() => {
    if (contractData && contributionCampaignIds && address) {
      const processed = [];
      for (let i = 0; i < contractData.length; i += 2) {
        const campaignResult = contractData[i];
        const contributionResult = contractData[i + 1];

        if (campaignResult?.status === "success" && contributionResult?.status === "success") {
          const d = campaignResult.result;
          const amount = contributionResult.result;

          if (amount && amount > 0n) {
            const safeBN = (v) => !v ? 0n : typeof v === "bigint" ? v : BigInt(v.toString());
            const safeNum = (v) => !v ? 0 : typeof v === "bigint" ? Number(v) : Number(v.toString());

            processed.push({
              campaignId: safeNum(d.id),
              campaignTitle: d.title,
              campaignDescription: d.description,
              amount: safeBN(amount),
              targetAmount: safeBN(d.targetAmount),
              raisedAmount: safeBN(d.raisedAmount),
              deadline: safeNum(d.deadline),
              active: d.active,
              timestamp: null,
            });
          }
        }
      }
      setContributions(processed);
    } else if (contributionCampaignIds && contributionCampaignIds.length === 0) {
      setContributions([]);
    }
  }, [contractData, contributionCampaignIds, address]);

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  if (!isConnected) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please connect your wallet to view your contributions.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalContributed = contributions.reduce(
    (sum, c) => sum + parseFloat(formatEther(c.amount || 0)), 0
  );

  return (
    <Layout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Contributions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your support for innovative projects
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Total Contributed", value: `${totalContributed.toFixed(4)} ETH`, icon: FiDollarSign, color: "secondary" },
            { label: "Projects Supported", value: contributions.length, icon: FiHeart, color: "tertiary" },
            { label: "Average Contribution", value: contributions.length > 0 ? `${(totalContributed / contributions.length).toFixed(4)} ETH` : "0.00 ETH", icon: FiCalendar, color: "accent" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft p-6 border border-gray-100 dark:border-primary-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
                <div className={`w-12 h-12 bg-${color}-50 dark:bg-${color}-900/20 rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contributions List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft border border-gray-100 dark:border-primary-700 p-6 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-primary-700 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-primary-700 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 dark:bg-primary-700 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : contributions.length > 0 ? (
          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-slate-soft border border-gray-100 dark:border-primary-700">
            <div className="p-6 border-b border-gray-200 dark:border-primary-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Contribution History
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-primary-700">
              {contributions.map((c, idx) => {
                const progress = (parseFloat(formatEther(c.raisedAmount)) / parseFloat(formatEther(c.targetAmount))) * 100;
                const isActive = c.active && new Date(c.deadline * 1000) > new Date();
                return (
                  <div key={idx} className="p-6 hover:bg-gray-50 dark:hover:bg-primary-700/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-secondary-500 to-tertiary-500 rounded-lg flex items-center justify-center shrink-0">
                          <FiHeart className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {c.campaignTitle}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 line-clamp-2">
                            {c.campaignDescription?.slice(0, 100)}...
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>Progress: {Math.min(progress, 100).toFixed(1)}%</span>
                            <span className={`px-2 py-1 rounded-full ${isActive
                              ? "bg-secondary-50 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-300"
                              : "bg-gray-100 text-gray-800 dark:bg-primary-900/50 dark:text-gray-400"
                              }`}>
                              {isActive ? "Active" : "Ended"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatEther(c.amount)} ETH
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          Target: {formatEther(c.targetAmount)} ETH
                        </p>
                        <button
                          onClick={() => router.push(`/campaign/${c.campaignId}`)}
                          className="text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 text-sm inline-flex items-center transition-colors"
                        >
                          View Campaign
                          <FiExternalLink className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-primary-800 rounded-xl border border-dashed border-gray-300 dark:border-primary-700">
            <FiHeart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No contributions yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start supporting innovative projects and make a difference.
            </p>
            <button
              onClick={() => router.push("/campaigns")}
              className="bg-gradient-emerald hover:shadow-emerald-glow text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 inline-flex items-center"
            >
              Browse Campaigns
              <FiExternalLink className="w-5 h-5 ml-2" />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}