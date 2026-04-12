/**
 * components/Campaign/CampaignDetails.js
 *
 * BUG FIX 1 — Milestone Requirement Gate:
 *   Contributions are now BLOCKED until the campaign creator has set up at
 *   least 2 milestones. Two surfaces:
 *     • Creator sees a persistent amber warning banner with a "Set Up Milestones"
 *       CTA — they cannot collect any funds until this is done.
 *     • Backers see a locked "Awaiting Milestone Setup" button instead of the
 *       contribution form, with an explanation.
 *   Logic: `milestonesReady = isMilestoneRegistered && rawMilestones.length >= 2`
 *
 * BUG FIX 2 — Released-Funds Lock ("Zombie Contribute" after withdrawal):
 *   ROOT CAUSE: After `withdrawMilestoneFunds()` the contract decrements
 *   `campaign.raisedAmount`. Once all milestone funds are released, raisedAmount
 *   drops back below targetAmount, making `isFunded` (raisedAmount >= target)
 *   false again — the Contribute form re-appears even though the campaign is
 *   completely over.
 *
 *   FIX (frontend-only guard, no contract change required):
 *     • Fetch all milestone statuses via `useCampaignMilestones`.
 *     • `anyMilestoneReleased` = at least one milestone has status 4 (Released)
 *       or 5 (Refunded). This means the creator has already withdrawn money —
 *       the campaign is in post-funding execution and MUST NOT accept new ETH.
 *     • `allMilestonesReleased` = every milestone is Released/Refunded. Used
 *       to show the "✓ Campaign Complete" badge and a more specific UI state.
 *     • `isClosedForContributions = isFunded || anyMilestoneReleased`
 *       — covers both the "still funded" path and the "funds withdrawn" path.
 *
 *   UI states (in priority order):
 *     1. allMilestonesReleased  → "Campaign Complete — Funds Released" slate badge
 *     2. isFunded               → "✓ Successfully Funded" emerald badge (existing)
 *     3. anyMilestoneReleased   → "Funding Closed – In Progress" amber badge
 *     4. milestonesReady=false  → milestone setup required (Bug Fix 1)
 *     5. Normal contribute form
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAccount, useContractRead } from "wagmi";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import {
  FiUser, FiClock, FiTarget, FiShare2,
  FiUsers, FiCalendar, FiFlag,
  FiPlusCircle, FiCheckCircle, FiLock, FiAlertTriangle,
  FiAlertCircle, FiBox,
} from "react-icons/fi";
import { useContract } from "../../hooks/useContract";
import { getFromIPFS } from "../../utils/ipfs";
import {
  formatEther, formatAddress, calculateTimeLeft,
  calculateProgress, formatDate, copyToClipboard,
} from "../../utils/helpers";
import { useNetworkContracts } from "../../hooks/useNetworkContracts";
import { CROWDFUNDING_ABI } from "../../constants/abi";
import MilestonePanel from "../Milestone/MilestonePanel";
import MilestoneCreationForm from "../Milestone/MilestoneCreationForm";

// Milestone status integers from the Solidity enum
const MS_RELEASED = 4;
const MS_REFUNDED = 5;
const MIN_MILESTONES = 2;

export default function CampaignDetails({ campaignId }) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const {
    useCampaign, useContributeToCampaignSimple,
    useWithdrawFunds, useGetRefund, useContribution,
    useIsCampaignRegistered, useCampaignMilestones,
  } = useContract();

  const { contractAddress: CONTRACT_ADDRESS } = useNetworkContracts();

  const [metadata, setMetadata] = useState(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showMilestoneSetup, setShowMilestoneSetup] = useState(false);

  const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignId);
  const { data: userContribution } = useContribution(campaignId, address);
  const { contribute, isLoading: contributing } = useContributeToCampaignSimple();
  const { withdrawFunds, isLoading: withdrawing } = useWithdrawFunds();
  const { getRefund, isLoading: refunding } = useGetRefund();

  const { data: isMilestoneRegistered, refetch: refetchRegistered } =
    useIsCampaignRegistered(campaignId);

  // BUG FIX 2: Fetch live milestone statuses so we can detect released state
  const { data: rawMilestones } = useCampaignMilestones(campaignId);

  const { data: contributions, isLoading: loadingContributions } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CROWDFUNDING_ABI,
    functionName: "getCampaignContributions",
    args: [campaignId],
    enabled: Boolean(campaignId && CONTRACT_ADDRESS),
    watch: true,
    cacheTime: 30000,
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      if (campaign?.metadataHash) {
        const result = await getFromIPFS(campaign.metadataHash);
        if (result.success) setMetadata(result.data);
      }
    };
    fetchMetadata();
  }, [campaign?.metadataHash]);

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-secondary-500" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Campaign Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">The campaign you're looking for doesn't exist or has been removed.</p>
        <button onClick={() => router.push("/campaigns")} className="bg-gradient-emerald hover:shadow-emerald-glow text-white px-6 py-2 rounded-lg transition-all">
          Browse Campaigns
        </button>
      </div>
    );
  }

  const progress = calculateProgress(campaign.raisedAmount, campaign.targetAmount);
  const timeLeft = calculateTimeLeft(campaign.deadline);
  const raisedAmount = formatEther(campaign.raisedAmount);
  const targetAmount = formatEther(campaign.targetAmount);
  const isCreator = address?.toLowerCase() === campaign.creator?.toLowerCase();

  // ── Funding state ──────────────────────────────────────────────────────────
  const isFunded =
    campaign.raisedAmount !== undefined &&
    campaign.targetAmount !== undefined &&
    BigInt(campaign.raisedAmount.toString()) >= BigInt(campaign.targetAmount.toString());

  // ── BUG FIX 2: Milestone release state ────────────────────────────────────
  // anyMilestoneReleased: creator has already withdrawn at least one milestone →
  //   campaign is in execution phase and MUST NOT accept new contributions.
  //   (After withdrawal, raisedAmount gets decremented in the contract, so
  //    isFunded would incorrectly flip back to false.)
  const anyMilestoneReleased =
    Array.isArray(rawMilestones) &&
    rawMilestones.some(
      (m) => Number(m.status) === MS_RELEASED || Number(m.status) === MS_REFUNDED
    );

  const allMilestonesReleased =
    Array.isArray(rawMilestones) &&
    rawMilestones.length > 0 &&
    rawMilestones.every(
      (m) => Number(m.status) === MS_RELEASED || Number(m.status) === MS_REFUNDED
    );

  // The single gate that kills the contribute form in all closed states
  const isClosedForContributions = isFunded || anyMilestoneReleased;

  // ── BUG FIX 1: Milestone setup requirement ─────────────────────────────────
  // Backers cannot contribute until the creator has set up ≥ MIN_MILESTONES.
  const milestonesReady =
    isMilestoneRegistered === true &&
    Array.isArray(rawMilestones) &&
    rawMilestones.length >= MIN_MILESTONES;

  // How many milestones still needed
  const milestonesNeeded = Math.max(0, MIN_MILESTONES - (rawMilestones?.length ?? 0));

  // ── Withdraw / refund eligibility (unchanged) ──────────────────────────────
  const isSuccessful = isFunded;
  const canWithdraw = isCreator && isSuccessful && !campaign.withdrawn;
  const canGetRefund = !isCreator && timeLeft.expired && !isSuccessful && !anyMilestoneReleased && userContribution > 0;

  // ── Contributions processing ───────────────────────────────────────────────
  const processedContributions = contributions
    ? contributions.map((c) => ({
      contributor: c.contributor,
      amount: c.amount,
      timestamp: c.timestamp ? Number(c.timestamp.toString()) : null,
    })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    : [];

  const contributorSummary = processedContributions.reduce((acc, c) => {
    const addr = c.contributor;
    if (!acc[addr]) acc[addr] = { address: addr, totalAmount: 0n, contributionCount: 0, lastContribution: c.timestamp };
    acc[addr].totalAmount += BigInt(c.amount.toString());
    acc[addr].contributionCount += 1;
    if (c.timestamp && c.timestamp > acc[addr].lastContribution) acc[addr].lastContribution = c.timestamp;
    return acc;
  }, {});
  const uniqueContributors = Object.values(contributorSummary).sort((a, b) => Number(b.totalAmount - a.totalAmount));

  const handleContribute = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      return toast.error("Please enter a valid contribution amount");
    }
    // BUG FIX 2: Extra UI-layer guard
    if (isClosedForContributions) {
      return toast.error("This campaign is no longer accepting contributions.");
    }
    // BUG FIX 1: Extra UI-layer guard
    if (!milestonesReady) {
      return toast.error("This campaign requires at least 2 milestones before contributions are accepted.");
    }
    const remainingEth = parseFloat(targetAmount) - parseFloat(raisedAmount);
    if (remainingEth <= 0) {
      return toast.error("This campaign has already reached its funding target.");
    }
    let finalAmount = parseFloat(contributionAmount);
    if (finalAmount > remainingEth) {
      toast(`Your amount was adjusted to the remaining allowance: ${remainingEth.toFixed(6)} ETH`, { icon: "ℹ️" });
      finalAmount = remainingEth;
      setContributionAmount(remainingEth.toFixed(6));
    }
    try {
      await contribute?.({ args: [campaignId], value: ethers.utils.parseEther(finalAmount.toFixed(18)) });
      setContributionAmount("");
    } catch (err) { console.error("Contribution error:", err); }
  };

  const handleShare = async () => {
    const success = await copyToClipboard(window.location.href);
    success ? toast.success("Link copied!") : toast.error("Failed to copy link");
  };

  // ── Hero badge / progress display ──────────────────────────────────────────
  // Priority: allMilestonesReleased > isFunded > anyMilestoneReleased > active
  const heroState = allMilestonesReleased
    ? "complete"
    : isFunded
      ? "funded"
      : anyMilestoneReleased
        ? "releasing"
        : "active";

  const progressDisplay = allMilestonesReleased || isFunded || anyMilestoneReleased
    ? 100
    : Math.min(progress, 100);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">

      {/* ── BUG FIX 1: Creator milestone requirement warning (top of page) ── */}
      {isCreator && !isMilestoneRegistered && !showMilestoneSetup && (
        <div className="flex items-start gap-4 p-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-xl shadow-sm">
          <FiAlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-amber-800 dark:text-amber-300 text-base mb-1">
              Action Required: Milestones Not Set Up
            </p>
            <p className="text-amber-700 dark:text-amber-400 text-sm leading-relaxed">
              Your campaign will <strong>not accept any donations</strong> until you create at
              least <strong>{MIN_MILESTONES} milestones</strong>. Backers can see your campaign
              but the contribution form is locked for everyone. Set up your milestones below to
              unlock funding.
            </p>
          </div>
          <button
            onClick={() => setShowMilestoneSetup(true)}
            className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Set Up Now
          </button>
        </div>
      )}

      {/* Milestone count warning: registered but < MIN */}
      {isCreator && isMilestoneRegistered && !milestonesReady && !showMilestoneSetup && (
        <div className="flex items-start gap-4 p-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-xl shadow-sm">
          <FiAlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-amber-800 dark:text-amber-300 text-base mb-1">
              Add {milestonesNeeded} More Milestone{milestonesNeeded !== 1 ? "s" : ""}
            </p>
            <p className="text-amber-700 dark:text-amber-400 text-sm leading-relaxed">
              You have {rawMilestones?.length ?? 0} milestone{rawMilestones?.length !== 1 ? "s" : ""} set up.
              Contributions are locked until you have at least <strong>{MIN_MILESTONES} milestones</strong>.
              Add {milestonesNeeded} more to unlock the contribution form.
            </p>
          </div>
        </div>
      )}

      {/* ── Campaign Hero Card ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-primary-800 rounded-xl shadow-lg overflow-hidden border border-stone-100 dark:border-primary-700">

        {/* Image */}
        <div className="relative h-64 md:h-80 bg-gradient-emerald">
          {metadata?.image
            ? <img src={metadata.image} alt={campaign.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-white text-8xl font-bold opacity-20">{campaign.title?.charAt(0) || "C"}</div>
          }

          {/* BUG FIX 2: "Campaign Complete" badge for all-released state */}
          {heroState === "complete" && (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 to-slate-900/50 flex items-end justify-start p-6">
              <div className="flex items-center gap-2 bg-slate-700 px-5 py-2.5 rounded-xl shadow-lg">
                <FiBox className="w-5 h-5 text-slate-200" />
                <span className="text-white font-bold text-base">✓ Campaign Complete — Funds Released</span>
              </div>
            </div>
          )}

          {/* "Successfully Funded" badge (existing, shown when funded but not yet releasing) */}
          {heroState === "funded" && (
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 to-emerald-900/40 flex items-end justify-start p-6">
              <div className="flex items-center gap-2 bg-emerald-500 px-5 py-2.5 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.7)] animate-pulse-slow">
                <FiCheckCircle className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-base">✓ Successfully Funded</span>
              </div>
            </div>
          )}

          {/* "In Progress" badge: some milestones released, not all */}
          {heroState === "releasing" && (
            <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 to-amber-900/30 flex items-end justify-start p-6">
              <div className="flex items-center gap-2 bg-amber-500 px-5 py-2.5 rounded-xl shadow-lg">
                <FiCheckCircle className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-base">Funded — Milestones In Progress</span>
              </div>
            </div>
          )}

          {/* Status chips top-left */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="flex gap-2 flex-wrap">
              {heroState === "complete" ? (
                <span className="px-3 py-1 text-xs font-bold bg-slate-700/90 text-white rounded-full backdrop-blur-sm">COMPLETE</span>
              ) : heroState === "funded" ? (
                <>
                  <span className="px-3 py-1 text-xs font-bold bg-secondary-500/80 text-white rounded-full backdrop-blur-sm">ACTIVE</span>
                  <span className="px-3 py-1 text-xs font-bold bg-emerald-500/90 text-white rounded-full backdrop-blur-sm shadow-[0_0_10px_rgba(16,185,129,0.5)]">FUNDED</span>
                </>
              ) : heroState === "releasing" ? (
                <>
                  <span className="px-3 py-1 text-xs font-bold bg-secondary-500/80 text-white rounded-full backdrop-blur-sm">ACTIVE</span>
                  <span className="px-3 py-1 text-xs font-bold bg-amber-500/90 text-white rounded-full backdrop-blur-sm">IN PROGRESS</span>
                </>
              ) : (
                <span className={`px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm ${campaign.active ? "bg-secondary-500/80 text-white" : "bg-red-500/80 text-white"}`}>
                  {campaign.active ? "ACTIVE" : "INACTIVE"}
                </span>
              )}
            </div>
            <button onClick={handleShare} className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all">
              <FiShare2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:gap-10">

            {/* Left */}
            <div className="flex-1 space-y-5">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{campaign.title}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">{campaign.description}</p>
              </div>

              <div className="flex items-center gap-4 p-4 bg-stone-50 dark:bg-primary-700/60 rounded-lg border border-stone-200 dark:border-primary-600">
                <div className="w-10 h-10 bg-secondary-500/20 dark:bg-secondary-500/10 rounded-full flex items-center justify-center border border-secondary-500/30">
                  <FiUser className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide">Project Creator</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                    {campaign.creator}
                    {isCreator && <span className="ml-2 text-secondary-600 dark:text-secondary-400 font-sans">(You)</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Right — Stats & Actions */}
            <div className="lg:w-80 mt-6 lg:mt-0">
              <div className="bg-stone-50 dark:bg-primary-700/50 rounded-xl p-6 border border-stone-200 dark:border-primary-600 space-y-5">

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
                    <span className={`font-bold ${heroState === "complete" ? "text-slate-500 dark:text-slate-400"
                      : isClosedForContributions ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-900 dark:text-white"
                      }`}>
                      {progressDisplay === 100 ? "100%" : `${progress.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                    {heroState === "complete" ? (
                      /* BUG FIX 2: Slate locked bar for fully-released state */
                      <div className="bg-slate-500 h-2.5 rounded-full w-full" />
                    ) : isClosedForContributions ? (
                      <div className="bg-emerald-500 h-2.5 rounded-full w-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    ) : (
                      <div className="bg-gradient-emerald h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(progress, 100)}%` }} />
                    )}
                  </div>
                  {heroState === "complete" && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium flex items-center gap-1">
                      <FiBox className="w-3 h-3" /> All milestone funds have been released
                    </p>
                  )}
                  {heroState === "funded" && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
                      <FiCheckCircle className="w-3 h-3" /> Funding target reached
                    </p>
                  )}
                  {heroState === "releasing" && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                      <FiCheckCircle className="w-3 h-3" /> Funded — milestones being released
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: parseFloat(raisedAmount).toFixed(3), label: "ETH Raised" },
                    { val: parseFloat(targetAmount).toFixed(3), label: "ETH Target" },
                    { val: uniqueContributors.length, label: "Backers" },
                    { val: timeLeft.expired ? "Ended" : timeLeft.text?.split(" ")[0] ?? "—", label: timeLeft.expired ? "" : "Days Left" },
                  ].map(({ val, label }, i) => (
                    <div key={i} className="bg-white dark:bg-primary-800 rounded-lg p-3 border border-stone-200 dark:border-primary-600 text-center">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{val}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>

                {/* ── Contribution form / locked states ───────────────────── */}

                {/* BUG FIX 2: Campaign Complete (all released) */}
                {heroState === "complete" && !isCreator && (
                  <button disabled className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 font-semibold py-3 rounded-lg border border-slate-300 dark:border-slate-600 cursor-not-allowed">
                    <FiBox className="w-4 h-4" />
                    Campaign Complete
                  </button>
                )}

                {/* BUG FIX 2: Some milestones released (in-progress state) */}
                {heroState === "releasing" && !isCreator && (
                  <button disabled className="w-full flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-semibold py-3 rounded-lg border-2 border-amber-300 dark:border-amber-700 cursor-not-allowed">
                    <FiLock className="w-4 h-4" />
                    Funding Closed — In Execution
                  </button>
                )}

                {/* Funded but not yet releasing (original mandate 1) */}
                {heroState === "funded" && !isCreator && (
                  <button disabled className="w-full flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold py-3 rounded-lg border-2 border-emerald-300 dark:border-emerald-700 cursor-not-allowed">
                    <FiLock className="w-4 h-4" />
                    Funding Closed
                  </button>
                )}

                {/* BUG FIX 1: Milestones not ready — locked message for backers */}
                {!isClosedForContributions && heroState === "active" && !milestonesReady && !isCreator && isConnected && (
                  <div className="space-y-3">
                    <button disabled className="w-full flex items-center justify-center gap-2 bg-stone-100 dark:bg-primary-700 text-stone-500 dark:text-gray-500 font-semibold py-3 rounded-lg border border-stone-300 dark:border-primary-600 cursor-not-allowed">
                      <FiAlertCircle className="w-4 h-4" />
                      Awaiting Milestone Setup
                    </button>
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 leading-relaxed">
                      The creator must set up at least <strong>{MIN_MILESTONES} milestones</strong> before
                      this campaign can accept contributions.
                    </p>
                  </div>
                )}

                {/* Normal contribute form */}
                {!isClosedForContributions && heroState === "active" && milestonesReady && !timeLeft.expired && campaign.active && !isCreator && isConnected && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Remaining:{" "}
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {Math.max(0, parseFloat(targetAmount) - parseFloat(raisedAmount)).toFixed(4)} ETH
                      </span>
                    </p>

                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={Math.max(0, parseFloat(targetAmount) - parseFloat(raisedAmount)).toFixed(6)}
                      placeholder="0.00 ETH"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      className="w-full px-4 py-3 border border-stone-300 dark:border-primary-600 rounded-lg text-sm bg-white dark:bg-primary-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-secondary-500 outline-none"
                    />

                    <button
                      onClick={handleContribute}
                      disabled={contributing || !contributionAmount}
                      className="w-full bg-gradient-emerald hover:shadow-emerald-glow disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 rounded-lg transition-all disabled:cursor-not-allowed"
                    >
                      {contributing ? "Processing..." : "Contribute Now"}
                    </button>
                  </div>
                )}

                {canWithdraw && (
                  <button onClick={() => withdrawFunds?.({ args: [campaignId] })} disabled={withdrawing}
                    className="w-full bg-secondary-500 hover:bg-secondary-600 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors disabled:cursor-not-allowed">
                    {withdrawing ? "Withdrawing..." : "Withdraw Funds"}
                  </button>
                )}

                {canGetRefund && (
                  <button onClick={() => getRefund?.({ args: [campaignId] })} disabled={refunding}
                    className="w-full bg-accent-500 hover:bg-accent-600 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors disabled:cursor-not-allowed">
                    {refunding ? "Processing..." : "Get Refund"}
                  </button>
                )}

                {!isConnected && (
                  <div className="text-center p-3 bg-amber-50 dark:bg-accent-900/20 border border-amber-200 dark:border-accent-800 rounded-lg">
                    <p className="text-amber-800 dark:text-accent-300 text-sm">Connect wallet to contribute</p>
                  </div>
                )}

                {userContribution > 0 && (
                  <div className="p-3 bg-secondary-50 dark:bg-secondary-900/20 border border-secondary-200 dark:border-secondary-800 rounded-lg">
                    <p className="text-sm text-secondary-800 dark:text-secondary-300">
                      Your contribution: <span className="font-bold">{formatEther(userContribution)} ETH</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Milestones Section ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-primary-800 rounded-xl shadow-lg border border-stone-100 dark:border-primary-700 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FiFlag className="w-5 h-5 text-tertiary-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Project Milestones</h2>
          </div>

          {/* Show "Set Up Milestones" for creator when not yet registered */}
          {isCreator && !isMilestoneRegistered && !showMilestoneSetup && (
            <button
              onClick={() => setShowMilestoneSetup(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <FiPlusCircle className="w-4 h-4" />
              Set Up Milestones
            </button>
          )}

          {/* Show "Add Milestone" for creator when registered but < MIN */}
          {isCreator && isMilestoneRegistered && !milestonesReady && !showMilestoneSetup && (
            <button
              onClick={() => setShowMilestoneSetup(true)}
              className="flex items-center gap-2 bg-tertiary-600 hover:bg-tertiary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <FiPlusCircle className="w-4 h-4" />
              Add Milestone ({rawMilestones?.length ?? 0}/{MIN_MILESTONES})
            </button>
          )}
        </div>

        {isCreator && showMilestoneSetup && (
          <MilestoneCreationForm
            campaignId={campaignId}
            campaignTarget={targetAmount}
            onDone={() => {
              setShowMilestoneSetup(false);
              refetchRegistered?.();
            }}
          />
        )}

        {!showMilestoneSetup && (
          <MilestonePanel
            campaignId={campaignId}
            creatorAddress={campaign.creator}
            campaignRaisedAmount={campaign.raisedAmount}
          />
        )}

        {/* BUG FIX 1: Improved message for backers when no milestones */}
        {!isCreator && !isMilestoneRegistered && (
          <div className="flex items-center gap-3 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <FiAlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-400">
              The creator has not set up milestones yet. Contributions are locked until at
              least <strong>{MIN_MILESTONES} milestones</strong> are configured.
            </p>
          </div>
        )}

        {!isCreator && isMilestoneRegistered && !milestonesReady && (
          <div className="flex items-center gap-3 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <FiAlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-400">
              Only {rawMilestones?.length ?? 0} of the required {MIN_MILESTONES} milestones
              have been set up. Contributions will unlock once {milestonesNeeded} more{" "}
              milestone{milestonesNeeded !== 1 ? "s are" : " is"} added.
            </p>
          </div>
        )}
      </div>

      {/* ── Tabs Section ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-primary-800 rounded-xl shadow-lg border border-stone-100 dark:border-primary-700 p-6 md:p-8">
        <div className="border-b border-stone-200 dark:border-primary-700 mb-6">
          <nav className="flex gap-8">
            {["overview", "contributors"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 ${activeTab === tab
                  ? "border-secondary-500 text-secondary-600 dark:text-secondary-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}>
                {tab}
                {tab === "contributors" && uniqueContributors.length > 0 && (
                  <span className="ml-1.5 bg-secondary-100 dark:bg-secondary-900/50 text-secondary-700 dark:text-secondary-300 text-xs font-bold px-2 py-0.5 rounded-full">
                    {uniqueContributors.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-tertiary-600 dark:text-tertiary-400 uppercase tracking-widest">Campaign Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <FiCalendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400 w-20">Created:</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(campaign.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <FiClock className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400 w-20">Deadline:</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(campaign.deadline)}</span>
                </div>
                {metadata?.category && (
                  <div className="flex items-center gap-3">
                    <FiTarget className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400 w-20">Category:</span>
                    <span className="text-gray-900 dark:text-white">{metadata.category}</span>
                  </div>
                )}
                {metadata?.tags?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 dark:text-gray-400 w-20 shrink-0 mt-0.5">Tags:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-900/50 text-secondary-700 dark:text-secondary-300 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {metadata?.additionalInfo && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Additional Information</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm border-l-4 border-stone-200 dark:border-gray-600 pl-4">
                  {metadata.additionalInfo}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "contributors" && (
          <div>
            {loadingContributions ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
              </div>
            ) : uniqueContributors.length > 0 ? (
              <div className="space-y-3">
                {uniqueContributors.map((c, i) => (
                  <div key={c.address}
                    className="flex items-center justify-between p-4 bg-stone-50 dark:bg-primary-900/50 border border-stone-100 dark:border-primary-700 rounded-lg hover:bg-stone-100 dark:hover:bg-primary-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-emerald rounded-full flex items-center justify-center text-white text-xs font-bold">
                        #{i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                          {formatAddress(c.address)}
                          {c.address.toLowerCase() === address?.toLowerCase() && (
                            <span className="ml-2 text-emerald-500 font-sans text-xs">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {c.contributionCount} contribution{c.contributionCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">{formatEther(c.totalAmount)} ETH</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(Number(raisedAmount) > 0
                          ? ((Number(formatEther(c.totalAmount)) / Number(raisedAmount)) * 100).toFixed(1)
                          : ((Number(formatEther(c.totalAmount)) / Number(targetAmount)) * 100).toFixed(1)
                        )}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FiUsers className="w-12 h-12 text-gray-300 dark:text-primary-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No contributors yet. Be the first to support this campaign!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
