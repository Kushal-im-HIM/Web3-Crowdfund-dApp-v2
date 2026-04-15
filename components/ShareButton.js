/**
 * components/ShareButton.js
 *
 * Idea 7 — One-click campaign share card.
 * Uses Web Share API on mobile; falls back to clipboard + pre-filled tweet/WhatsApp.
 * Zero dependencies beyond react-icons. Purely additive.
 */

import { useState } from "react";
import { FiShare2, FiTwitter, FiCheck, FiCopy, FiMessageCircle } from "react-icons/fi";

export default function ShareButton({ campaign, className = "" }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  if (!campaign) return null;

  const url = typeof window !== "undefined" ? window.location.href : "";
  const title = campaign.title || "Check out this campaign on EthosFund";
  const raisedEth = campaign.raisedAmount
    ? (Number(campaign.raisedAmount.toString()) / 1e18).toFixed(2)
    : "0";
  const targetEth = campaign.targetAmount
    ? (Number(campaign.targetAmount.toString()) / 1e18).toFixed(2)
    : "?";

  const shareText = `"${title}" — ${raisedEth}/${targetEth} ETH raised on EthosFund 🌿 Milestone-based, 0% fees, on-chain transparent. Back it here:`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + url)}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url });
        return;
      } catch {}
    }
    setOpen(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="relative">
      <button
        onClick={handleNativeShare}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-primary-700 rounded-lg transition-all ${className}`}
      >
        <FiShare2 className="w-4 h-4" />
        Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 modal-backdrop"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-primary-800 rounded-2xl border border-emerald-100 dark:border-primary-700 w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-emerald-50 dark:border-primary-700">
              <p className="font-display font-bold text-slate-900 dark:text-white">Share this campaign</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{title}</p>
            </div>

            <div className="p-4 space-y-2">
              {/* Copy link */}
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 p-3 hover:bg-emerald-50 dark:hover:bg-primary-700 rounded-xl transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-primary-700 flex items-center justify-center">
                  {copied ? <FiCheck className="w-4 h-4 text-emerald-500" /> : <FiCopy className="w-4 h-4 text-slate-500" />}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {copied ? "Link copied!" : "Copy link"}
                </span>
              </button>

              {/* Tweet */}
              <a
                href={tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 p-3 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                  <FiTwitter className="w-4 h-4 text-sky-500" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Share on X / Twitter</span>
              </a>

              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 p-3 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <FiMessageCircle className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Share on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
