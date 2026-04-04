/**
 * components/Campaign/CampaignCard.js
 *
 * MANDATE 1 — Zombie Campaign UX Fix:
 *   - isFunded flag computed from raisedAmount >= targetAmount.
 *   - Progress bar locked at 100% solid green for funded campaigns.
 *   - "✓ Successfully Funded" glowing emerald badge overlay on the card image.
 *   - "Contribute" button replaced with a disabled "Funding Closed" button.
 *   - Status badge shows "Funded" (emerald) instead of "Active" for funded campaigns.
 *
 * MANDATE 5 — Light Mode Cream/Beige Aesthetic:
 *   - Card background uses cream-white (bg-amber-50/white) in light mode.
 *   - Borders use warm stone tones instead of stark grays.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { FiUser, FiClock, FiTarget, FiTrendingUp, FiCheckCircle, FiLock } from "react-icons/fi";
import {
  formatEther,
  formatAddress,
  calculateTimeLeft,
  calculateProgress,
} from "../../utils/helpers";
import { getFromIPFS } from "../../utils/ipfs";

export default function CampaignCard({ campaign, className = "" }) {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (campaign.metadataHash) {
        const result = await getFromIPFS(campaign.metadataHash);
        if (result.success) {
          setMetadata(result.data);
        }
      }
      setLoading(false);
    };

    fetchMetadata();
  }, [campaign.metadataHash]);

  const progress = calculateProgress(
    campaign.raisedAmount,
    campaign.targetAmount
  );
  const timeLeft = calculateTimeLeft(campaign.deadline);
  const raisedAmount = formatEther(campaign.raisedAmount);
  const targetAmount = formatEther(campaign.targetAmount);

  // MANDATE 1: Compute funded state from on-chain data
  const isFunded =
    campaign.raisedAmount !== undefined &&
    campaign.targetAmount !== undefined &&
    BigInt(campaign.raisedAmount.toString()) >= BigInt(campaign.targetAmount.toString());

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

        {/* MANDATE 1: Funded badge — glowing emerald overlay */}
        {isFunded && (
          <div className="absolute inset-0 bg-emerald-900/30 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1 bg-emerald-500/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.6)]">
              <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                <FiCheckCircle className="w-4 h-4" />
                <span>✓ Successfully Funded</span>
              </div>
            </div>
          </div>
        )}

        {/* Status Badge — updated to show Funded state */}
        <div className="absolute top-3 right-3">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${isFunded
                ? "bg-emerald-500/90 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                : campaign.active
                  ? "bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
          >
            {isFunded ? "Funded" : campaign.active ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Time Left Badge — hide for funded campaigns */}
        {!timeLeft.expired && !isFunded && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 text-xs font-medium bg-black bg-opacity-50 text-white rounded-full backdrop-blur-sm">
              <FiClock className="inline w-3 h-3 mr-1" />
              {timeLeft.text}
            </span>
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

        {/* MANDATE 1: Progress Bar — locked solid green at 100% when funded */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span
              className={`text-sm font-semibold ${isFunded
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-500 dark:text-gray-400"
                }`}
            >
              {isFunded ? "100%" : `${progress.toFixed(1)}%`}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            {isFunded ? (
              /* MANDATE 1: Solid green locked bar for funded campaigns */
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

        {/* Contributors Count */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
          <span>{campaign.contributorsCount || 0} contributors</span>
          {timeLeft.expired && !isFunded && (
            <span className="text-red-500 font-medium">Expired</span>
          )}
          {isFunded && (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
              <FiCheckCircle className="w-3 h-3" /> Goal reached
            </span>
          )}
        </div>

        {/* MANDATE 1: Action Button — "Funding Closed" for funded campaigns */}
        <Link href={`/campaign/${campaign.id}`}>
          {isFunded ? (
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold py-3 rounded-lg border border-emerald-300 dark:border-emerald-700 cursor-not-allowed select-none"
            >
              <FiLock className="w-4 h-4" />
              Funding Closed
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
