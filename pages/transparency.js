/**
 * pages/transparency.js
 *
 * ERROR 1 FIX — Light Theme for Transparency Dashboard
 *   Hero header was `bg-gradient-to-br from-slate-800 to-slate-900` with no
 *   light-mode override — permanently dark. Fixed with a dual-theme header:
 *   cream/emerald in light mode, original dark slate in dark mode.
 *
 * ERROR 3 FIX — Network Stuck on Localhost + Theme Toggle
 *   `IS_LOCALHOST` was a module-level constant baked from NEXT_PUBLIC_NETWORK at
 *   boot. Switching MetaMask to Sepolia never updated it, so the page kept
 *   showing "Running on localhost — wallet tab shows mock data" even on Sepolia.
 *   Fix: replace the module constant with `useNetworkContracts()` so the banner,
 *   network label, and fetchWalletTransactions() all respond to the live chain.
 *
 *   Theme toggle: The Header already handles isDark state correctly. The
 *   "frozen" appearance was caused by the page-level IS_LOCALHOST baking
 *   causing a mis-render. No separate theme state is needed here.
 */

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import Layout from "../components/Layout/Layout";
import {
  FiSearch, FiExternalLink, FiCopy, FiRefreshCw,
  FiActivity, FiList, FiAlertCircle, FiCheckCircle,
  FiXCircle, FiInfo, FiUser, FiTarget, FiHeart,
  FiAlertTriangle, FiDatabase,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useContract } from "../hooks/useContract";
import { useNetworkContracts } from "../hooks/useNetworkContracts";
import {
  fetchWalletTransactions,
  fetchWalletTransactionsForChain,
  truncateHex,
  getTxExplorerUrl,
  getAddressExplorerUrl,
} from "../utils/transparencyUtils";
import { formatEther, formatDate, copyToClipboard } from "../utils/helpers";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return (
    <div className={`animate-pulse rounded bg-slate-200 dark:bg-primary-700 ${className}`} />
  );
}

function StatusBadge({ status }) {
  if (status === "success")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
        <FiCheckCircle className="w-3 h-3" /> Success
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
      <FiXCircle className="w-3 h-3" /> Failed
    </span>
  );
}

function MethodBadge({ label }) {
  const colours = {
    createCampaign: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    contributeToCampaign: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    contributeToMilestone: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    withdrawCampaignFunds: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    withdrawMilestoneFunds: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    getRefund: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    claimMilestoneRefund: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    registerCampaign: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
    createMilestone: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
    submitMilestoneEvidence: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    "ETH Transfer": "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300",
  };
  const cls = colours[label] ?? "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300";
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

// ─── Tab: Wallet Transactions ─────────────────────────────────────────────────

function WalletTransactionsTab({ address, isLocalhost, chainId }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [error, setError] = useState(null);

  // ERROR 3 FIX: pass live chainId into the fetch so it targets the correct
  // Etherscan chain rather than the boot-time IS_LOCALHOST constant
  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWalletTransactionsForChain(address, isLocalhost, chainId);
      setTxs(result.data);
      setIsMock(result.isMock);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [address, isLocalhost, chainId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border border-slate-200 dark:border-primary-700 rounded-xl">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-20 h-4 flex-1" />
            <Skeleton className="w-20 h-4 flex-1" />
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-16 h-5 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
        <FiAlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Failed to load transactions</p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-1">{error}</p>
          <button onClick={load} className="mt-2 text-xs text-red-600 dark:text-red-400 underline hover:no-underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (txs.length === 0) {
    return (
      <div className="mt-6 text-center py-10 text-slate-400 dark:text-gray-600">
        <FiDatabase className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No transactions found for this address.</p>
      </div>
    );
  }

  const TABLE_HEADERS = ["TX Hash", "Method", "From", "To", "Value (ETH)", "Date", "Status"];

  return (
    <div className="mt-2">
      {/* Mock data banner */}
      {isMock && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <FiDatabase className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Mock data</strong> — running on localhost.{" "}
            Switch to Sepolia to see real transactions.
          </p>
        </div>
      )}

      {/* Refresh */}
      <div className="flex justify-end mb-2">
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 hover:text-secondary-600 dark:hover:text-secondary-400 transition-colors"
        >
          <FiRefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-primary-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-primary-800 border-b border-slate-200 dark:border-primary-700">
              {TABLE_HEADERS.map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-primary-700">
            {txs.map((tx) => {
              const explorerUrl = getTxExplorerUrl(tx.hash);
              return (
                <tr
                  key={tx.hash}
                  className="hover:bg-slate-50 dark:hover:bg-primary-800/60 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-secondary-600 dark:text-secondary-400">
                        {truncateHex(tx.hash, 6, 4)}
                      </span>
                      {explorerUrl && (
                        <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
                          className="text-slate-400 hover:text-secondary-500 transition-colors">
                          <FiExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3"><MethodBadge label={tx.methodLabel} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-gray-400">
                    {truncateHex(tx.from, 6, 4)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-gray-400">
                    {truncateHex(tx.to, 6, 4)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white text-xs">
                    {parseFloat(tx.value) > 0
                      ? <span>Ξ {parseFloat(tx.value).toFixed(4)}</span>
                      : <span className="text-slate-400">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                    {tx.timestamp
                      ? new Date(tx.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3 mt-3">
        {txs.map((tx) => {
          const explorerUrl = getTxExplorerUrl(tx.hash);
          return (
            <div key={tx.hash} className="p-4 border border-slate-200 dark:border-primary-700 rounded-xl bg-white dark:bg-primary-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-secondary-600 dark:text-secondary-400">
                  {truncateHex(tx.hash, 8, 6)}
                </span>
                {explorerUrl && (
                  <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                    <FiExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between">
                <MethodBadge label={tx.methodLabel} />
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {parseFloat(tx.value) > 0 ? `Ξ ${parseFloat(tx.value).toFixed(4)}` : "—"}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-gray-500">
                {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "—"}
              </p>
              <StatusBadge status={tx.status} />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 dark:text-gray-600 text-center mt-4">
        Showing latest {txs.length} transactions
        {!isMock && " · Source: Etherscan"}
      </p>
    </div>
  );
}

// ─── Tab: Campaign Activity ────────────────────────────────────────────────────

function CampaignActivityTab({ address }) {
  const { useUserCampaigns, useUserContributions, useMultipleCampaigns } = useContract();

  const { data: createdIds, isLoading: loadingCreated } = useUserCampaigns(address);
  const { data: contributedIds, isLoading: loadingContributed } = useUserContributions(address);

  const { campaigns: createdCampaigns, isLoading: loadingCreatedDetails } = useMultipleCampaigns(createdIds);
  const { campaigns: contributedCampaigns, isLoading: loadingContributedDetails } = useMultipleCampaigns(contributedIds);

  const isLoading = loadingCreated || loadingContributed || loadingCreatedDetails || loadingContributedDetails;

  if (isLoading) {
    return (
      <div className="mt-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 border border-slate-200 dark:border-primary-700 rounded-xl space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  const hasCreated = createdCampaigns?.length > 0;
  const hasContributed = contributedCampaigns?.length > 0;

  if (!hasCreated && !hasContributed) {
    return (
      <div className="mt-6 text-center py-10 text-slate-400 dark:text-gray-600">
        <FiDatabase className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No on-chain campaign activity found for this address.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-8">

      {/* Campaigns Created */}
      {hasCreated && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FiTarget className="w-4 h-4 text-secondary-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Campaigns Created ({createdCampaigns.length})
            </h3>
          </div>
          <div className="space-y-3">
            {createdCampaigns.map((c) => {
              const raised = parseFloat(formatEther(c.raisedAmount));
              const target = parseFloat(formatEther(c.targetAmount));
              const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
              const expired = Number(c.deadline) * 1000 < Date.now();
              const funded = raised >= target;
              return (
                <div key={c.id.toString()}
                  className="p-4 bg-white dark:bg-primary-800 border border-slate-200 dark:border-primary-700 rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{c.title}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                        ID #{c.id.toString()} · Created {formatDate(c.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {funded && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Funded</span>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${expired ? "bg-slate-100 dark:bg-gray-700 text-slate-500" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"}`}>
                        {expired ? "Ended" : "Active"}
                      </span>
                      {c.withdrawn && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">Withdrawn</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500 dark:text-gray-400">
                      <span>Ξ {raised.toFixed(4)} raised</span>
                      <span>Target: Ξ {target.toFixed(4)} · {progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-primary-700 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-secondary-500 to-secondary-400 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-gray-400">
                    <FiUser className="w-3 h-3" />
                    <span>{c.contributorsCount?.toString() ?? "0"} backers</span>
                    <span>·</span>
                    <span>Deadline {formatDate(c.deadline)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Campaigns Contributed To */}
      {hasContributed && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FiHeart className="w-4 h-4 text-accent-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Campaigns Backed ({contributedCampaigns.length})
            </h3>
          </div>
          <div className="space-y-3">
            {contributedCampaigns.map((c) => {
              const target = parseFloat(formatEther(c.targetAmount));
              const raised = parseFloat(formatEther(c.raisedAmount));
              const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
              const expired = Number(c.deadline) * 1000 < Date.now();
              const funded = raised >= target;
              return (
                <div key={c.id.toString()}
                  className="p-4 bg-white dark:bg-primary-800 border border-slate-200 dark:border-primary-700 rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{c.title}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                        ID #{c.id.toString()} by <span className="font-mono">{truncateHex(c.creator, 6, 4)}</span>
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {funded && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Funded</span>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${expired ? "bg-slate-100 dark:bg-gray-700 text-slate-500" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"}`}>
                        {expired ? "Ended" : "Active"}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-primary-700 rounded-full h-1.5 mt-2">
                    <div className="bg-gradient-to-r from-accent-500 to-accent-400 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1.5 text-right">
                    {progress.toFixed(1)}% funded · Ξ {raised.toFixed(4)} / Ξ {target.toFixed(4)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "wallet", label: "Wallet Transactions", icon: FiList },
  { id: "activity", label: "Campaign Activity", icon: FiActivity },
];

export default function TransparencyPage() {
  const { address: connectedAddress } = useAccount();
  // ERROR 3 FIX: live network state — updates when MetaMask chain switches
  const { isLocalhost, name: networkName, chainId } = useNetworkContracts();

  const [inputValue, setInputValue] = useState("");
  const [searchedAddress, setSearchedAddress] = useState("");
  const [activeTab, setActiveTab] = useState("wallet");
  const [addressError, setAddressError] = useState("");

  useEffect(() => {
    if (connectedAddress && !inputValue) {
      setInputValue(connectedAddress);
    }
  }, [connectedAddress]);

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (!ethers.utils.isAddress(trimmed)) {
      setAddressError("Please enter a valid Ethereum address (0x…)");
      return;
    }
    setAddressError("");
    setSearchedAddress(trimmed.toLowerCase());
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSearch(); };

  const handleCopyAddress = async () => {
    if (!searchedAddress) return;
    await copyToClipboard(searchedAddress);
    toast.success("Address copied!");
  };

  const explorerUrl = getAddressExplorerUrl(searchedAddress);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">

        {/* ── ERROR 1 FIX: Page Header — dual theme ──────────────────────────
            Light:  warm cream-to-emerald gradient, dark slate text
            Dark:   original slate-800 → slate-900 gradient, white text
        */}
        <div className="relative overflow-hidden rounded-xl p-7 shadow-sm border
          bg-gradient-to-br from-slate-100 via-emerald-50 to-slate-100 border-slate-200
          dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 dark:border-slate-700/50">

          {/* Decorative blurs — visible in both modes */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-secondary-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FiSearch className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
                <span className="text-xs font-bold text-secondary-600 dark:text-secondary-400 uppercase tracking-widest">
                  Creator Audit Tool
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                Transparency Dashboard
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg">
                Paste any Ethereum address to audit their wallet transactions and on-chain campaign activity.
                {/* ERROR 3 FIX: use live `isLocalhost` not boot-time constant */}
                {isLocalhost && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">
                    Running on localhost — wallet tab shows mock data.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Search Bar ──────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-primary-800 rounded-xl shadow-sm border border-slate-200 dark:border-primary-700 p-5">
          <label className="block text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-2">
            Creator / Wallet Address
          </label>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setAddressError(""); }}
                onKeyDown={handleKeyDown}
                placeholder="0x..."
                spellCheck={false}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg text-sm font-mono
                  bg-white dark:bg-primary-700
                  text-slate-900 dark:text-white
                  focus:ring-2 focus:ring-secondary-500 outline-none transition-colors ${addressError
                    ? "border-red-400 dark:border-red-600"
                    : "border-slate-300 dark:border-primary-600"
                  }`}
              />
            </div>
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 bg-secondary-600 hover:bg-secondary-700 active:bg-secondary-800 text-white font-semibold px-5 py-3 rounded-lg transition-colors text-sm"
            >
              <FiSearch className="w-4 h-4" />
              Audit
            </button>
          </div>

          {addressError && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <FiAlertTriangle className="w-3.5 h-3.5" /> {addressError}
            </p>
          )}

          {connectedAddress && connectedAddress.toLowerCase() !== inputValue.toLowerCase() && (
            <button
              onClick={() => setInputValue(connectedAddress)}
              className="mt-2 text-xs text-secondary-600 dark:text-secondary-400 hover:underline flex items-center gap-1"
            >
              <FiUser className="w-3 h-3" /> Use my connected wallet
            </button>
          )}
        </div>

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {searchedAddress && (
          <div className="bg-white dark:bg-primary-800 rounded-xl shadow-sm border border-slate-200 dark:border-primary-700 p-5">

            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary-500 to-accent-500 flex items-center justify-center shrink-0">
                  <FiUser className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white break-all">
                    {searchedAddress}
                  </p>
                  {/* ERROR 3 FIX: live networkName */}
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    {networkName} network
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyAddress}
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 hover:text-secondary-600 dark:hover:text-secondary-400 border border-slate-200 dark:border-primary-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <FiCopy className="w-3.5 h-3.5" /> Copy
                </button>
                {explorerUrl && (
                  <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 hover:text-secondary-600 dark:hover:text-secondary-400 border border-slate-200 dark:border-primary-600 px-3 py-1.5 rounded-lg transition-colors">
                    <FiExternalLink className="w-3.5 h-3.5" /> Etherscan
                  </a>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-primary-700 mb-2">
              <nav className="flex gap-6">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === id
                        ? "border-secondary-500 text-secondary-600 dark:text-secondary-400"
                        : "border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300"
                      }`}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === "wallet" && (
              /* ERROR 3 FIX: pass live isLocalhost + chainId to the tab */
              <WalletTransactionsTab address={searchedAddress} isLocalhost={isLocalhost} chainId={chainId} />
            )}
            {activeTab === "activity" && (
              <CampaignActivityTab address={searchedAddress} />
            )}
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {!searchedAddress && (
          <div className="text-center py-14 text-slate-400 dark:text-gray-600">
            <FiSearch className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Enter an address above and press <strong>Audit</strong> to begin.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}