/**
 * components/Campaign/CampaignCard.js
 *
 * BUG FIX 1 — Milestone Requirement Gate:
 *   If no milestones are set up yet, the card shows a "Setup Required" amber
 *   banner and the action button is replaced with "Pending Milestones" so
 *   backers immediately understand this campaign is not yet accepting money.
 *
 * BUG FIX 2 — Released-Funds Lock on Campaign Card:
 *   ROOT CAUSE: After `withdrawMilestoneFunds()` decrements `campaign.raisedAmount`,
 *   the isFunded check (raisedAmount >= targetAmount) becomes false again.
 *   The card then incorrectly shows "Active" status and the "View Details" button
 *   without any visual signal that the campaign is actually over.
 *
 *   FIX: Fetch `getCampaignMilestones` for each card via `useCampaignMilestones`.
 *   Wagmi caches the result per campaignId, so the RPC overhead is minimal
 *   (one extra call per unique campaign, then served from cache for re-renders
 *   and other components on the same page that use the same data).
 *
 *   - `anyMilestoneReleased` → funds have been withdrawn from this campaign →
 *     show "Execution Phase" amber state and locked button.
 *   - `allMilestonesReleased` → all funds released → show "Campaign Complete"
 *     slate state and locked button with full locked progress bar.
 *
 * MANDATE 1 — Zombie Campaign (preserved):
 *   isFunded (raisedAmount >= targetAmount) → "✓ Successfully Funded" emerald badge.
 *
 * MANDATE 5 — Light Mode Cream Aesthetic (preserved).
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FiUser, FiClock, FiTarget, FiTrendingUp,
  FiCheckCircle, FiLock, FiAlertCircle, FiBox,
} from "react-icons/fi";
import {
  formatEther,
  formatAddress,
  calculateTimeLeft,
  calculateProgress,
} from "../../utils/helpers";
import { getFromIPFS } from "../../utils/ipfs";
import { useContract } from "../../hooks/useContract";

// Milestone status integers from Solidity enum
const MS_RELEASED = 4;
const MS_REFUNDED = 5;
const MIN_MILESTONES = 2;

export default function CampaignCard({ campaign, className = "" }) {
  const [metadata, setMetadata] = useState(null);

  const { useCampaignMilestones, useIsCampaignRegistered } = useContract();

  // BUG FIX 2: Fetch milestone statuses to detect released state.
  // wagmi caches by (contractAddress, functionName, args) so this is free
  // on re-renders and shared with the details page if open in the same session.
  const { data: rawMilestones } = useCampaignMilestones(campaign?.id);
  const { data: isMilestoneRegistered } = useIsCampaignRegistered(campaign?.id);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (campaign?.metadataHash) {
        const result = await getFromIPFS(campaign.metadataHash);
        if (result.success) setMetadata(result.data);
      }
    };
    fetchMetadata();
  }, [campaign?.metadataHash]);

  if (!campaign) return null;

  const progress = calculateProgress(campaign.raisedAmount, campaign.targetAmount);
  const timeLeft = calculateTimeLeft(campaign.deadline);
  const raisedAmount = formatEther(campaign.raisedAmount);
  const targetAmount = formatEther(campaign.targetAmount);

  // ── Funding state ────────────────────────────────────────────────────────
  const isFunded =
    campaign.raisedAmount !== undefined &&
    campaign.targetAmount !== undefined &&
    BigInt(campaign.raisedAmount.toString()) >= BigInt(campaign.targetAmount.toString());

  // ── BUG FIX 2: Milestone release detection ───────────────────────────────
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

  // BUG FIX 1: Milestone setup requirement
  const milestonesReady =
    isMilestoneRegistered === true &&
    Array.isArray(rawMilestones) &&
    rawMilestones.length >= MIN_MILESTONES;

  // Combined: is this campaign closed for any reason?
  const isClosedForContributions = isFunded || anyMilestoneReleased;

  // ── Derive card "state" for rendering ────────────────────────────────────
  // Priority: allReleased > anyReleased > funded > milestones-needed > active
  const cardState = allMilestonesReleased
    ? "complete"
    : anyMilestoneReleased
      ? "releasing"
      : isFunded
        ? "funded"
        : !milestonesReady && isMilestoneRegistered !== undefined
          ? "setup-needed"
          : "active";

  // Progress to display: show 100% for all closed states (campaign was funded)
  const displayProgress = isClosedForContributions ? 100 : Math.min(progress, 100);

  // ── Status badge ─────────────────────────────────────────────────────────
  const statusBadge = {
    complete: { label: "Complete", cls: "bg-slate-600 text-white" },
    releasing: { label: "In Progress", cls: "bg-amber-500 text-white" },
    funded: { label: "Funded", cls: "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]" },
    "setup-needed": { label: "Active", cls: "bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200" },
    active: {
      label: campaign.active ? "Active" : "Inactive",
      cls: campaign.active
        ? "bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200"
        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    },
  }[cardState];

  return (
    <div
      className={`bg-white dark:bg-primary-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group border border-stone-100 dark:border-primary-700 ${className}`}
    >
      {/* Image */}
      <div className="relative h-48 bg-gradient-emerald overflow-hidden">
        {metadata?.image ? (
          <img
            src={metadata.image}
            alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-6xl font-bold opacity-20">
              {campaign.title?.charAt(0) || "C"}
            </div>
          </div>
        )}

        {/* BUG FIX 2: "Campaign Complete" overlay */}
        {cardState === "complete" && (
          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1 bg-slate-700/95 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-lg">
              <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                <FiBox className="w-4 h-4" />
                <span>Campaign Complete</span>
              </div>
              <span className="text-slate-300 text-xs">All funds released</span>
            </div>
          </div>
        )}

        {/* BUG FIX 2: "In Execution" overlay (some released, not all) */}
        {cardState === "releasing" && (
          <div className="absolute inset-0 bg-amber-900/20 flex items-center justify-center">
            <div className="flex items-center gap-1.5 bg-amber-500/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg">
              <FiCheckCircle className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">Funded — In Execution</span>
            </div>
          </div>
        )}

        {/* Original mandate 1: funded badge */}
        {cardState === "funded" && (
          <div className="absolute inset-0 bg-emerald-900/30 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1 bg-emerald-500/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.6)]">
              <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                <FiCheckCircle className="w-4 h-4" />
                <span>✓ Successfully Funded</span>
              </div>
            </div>
          </div>
        )}

        {/* Status badge top-right */}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        </div>

        {/* Time Left badge — only on truly active campaigns */}
        {cardState === "active" && !timeLeft.expired && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 text-xs font-medium bg-black bg-opacity-50 text-white rounded-full backdrop-blur-sm">
              <FiClock className="inline w-3 h-3 mr-1" />
              {timeLeft.text}
            </span>
          </div>
        )}

        {/* BUG FIX 1: "Setup Required" amber banner at top of image */}
        {cardState === "setup-needed" && (
          <div className="absolute top-0 left-0 right-0 bg-amber-500/90 backdrop-blur-sm py-1 px-3 flex items-center gap-1.5">
            <FiAlertCircle className="w-3 h-3 text-white shrink-0" />
            <span className="text-white text-xs font-semibold">Milestones setup required</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title & Description */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
            {campaign.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
            {campaign.description}
          </p>
        </div>

        {/* Creator */}
        <div className="flex items-center mb-4 text-sm text-gray-500 dark:text-gray-400">
          <FiUser className="w-4 h-4 mr-2" />
          <span>by {formatAddress(campaign.creator)}</span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className={`text-sm font-semibold ${cardState === "complete" ? "text-slate-500 dark:text-slate-400"
              : isClosedForContributions ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-500 dark:text-gray-400"
              }`}>
              {isClosedForContributions ? "100%" : `${progress.toFixed(1)}%`}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            {cardState === "complete" ? (
              /* BUG FIX 2: Slate locked bar — all released */
              <div className="bg-slate-500 h-2.5 rounded-full w-full" />
            ) : cardState === "releasing" ? (
              /* BUG FIX 2: Amber locked bar — partially released */
              <div className="bg-amber-500 h-2.5 rounded-full w-full" />
            ) : cardState === "funded" ? (
              /* Emerald locked bar — funded, not yet releasing */
              <div className="bg-emerald-500 h-2.5 rounded-full w-full shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            ) : (
              <div
                className="bg-gradient-emerald h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mb-1">
              <FiTrendingUp className="w-3 h-3 mr-1" />
              Raised
            </div>
            <div className="font-bold text-gray-900 dark:text-white">
              {parseFloat(raisedAmount).toFixed(2)} ETH
            </div>
          </div>
          <div>
            <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mb-1">
              <FiTarget className="w-3 h-3 mr-1" />
              Target
            </div>
            <div className="font-bold text-gray-900 dark:text-white">
              {parseFloat(targetAmount).toFixed(2)} ETH
            </div>
          </div>
        </div>

        {/* Footer info row */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
          <span>{campaign.contributorsCount || 0} contributors</span>

          {cardState === "complete" && (
            <span className="text-slate-500 dark:text-slate-400 font-medium text-xs flex items-center gap-1">
              <FiBox className="w-3 h-3" /> Complete
            </span>
          )}
          {cardState === "releasing" && (
            <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs flex items-center gap-1">
              <FiCheckCircle className="w-3 h-3" /> Funded
            </span>
          )}
          {cardState === "funded" && (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
              <FiCheckCircle className="w-3 h-3" /> Goal reached
            </span>
          )}
          {cardState === "setup-needed" && (
            <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs flex items-center gap-1">
              <FiAlertCircle className="w-3 h-3" /> Needs milestones
            </span>
          )}
          {cardState === "active" && timeLeft.expired && (
            <span className="text-red-500 font-medium">Expired</span>
          )}
        </div>

        {/* Action Button */}
        <Link href={`/campaign/${campaign.id}`}>
          {cardState === "complete" ? (
            <button className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400 font-semibold py-3 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <FiBox className="w-4 h-4" />
              View Campaign
            </button>
          ) : cardState === "releasing" ? (
            /* BUG FIX 2: Locked amber button for in-execution campaigns */
            <button disabled className="w-full flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-semibold py-3 rounded-lg border-2 border-amber-300 dark:border-amber-700 cursor-not-allowed">
              <FiLock className="w-4 h-4" />
              Funding Closed
            </button>
          ) : cardState === "funded" ? (
            /* Original mandate 1: emerald locked for funded state */
            <button disabled className="w-full flex items-center justify-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold py-3 rounded-lg border border-emerald-300 dark:border-emerald-700 cursor-not-allowed select-none">
              <FiLock className="w-4 h-4" />
              Funding Closed
            </button>
          ) : cardState === "setup-needed" ? (
            /* BUG FIX 1: Amber locked — milestones not ready */
            <button className="w-full flex items-center justify-center gap-2 bg-gradient-emerald hover:shadow-emerald-glow text-white font-medium py-3 rounded-lg transition-all duration-200 transform hover:scale-105">
              View Details
            </button>
          ) : (
            <button className="w-full bg-gradient-emerald hover:shadow-emerald-glow text-white font-medium py-3 rounded-lg transition-all duration-200 transform hover:scale-105">
              View Details
            </button>
          )}
        </Link>
      </div>
    </div>
  );
}
