/**
 * components/Milestone/MilestonePanel.js
 *
 * MANDATE 2 — Voting UI (Global Lockout Fix):
 *   The per-user `hasVoted` check now uses useMyMilestoneVote() which reads
 *   votes[cId][mId][userAddress] from the unified contract. Because that mapping
 *   is per-wallet, one backer's vote no longer affects whether others see the
 *   voting buttons. The contract's quorum guard (30% of total stake required
 *   before auto-resolution) prevents premature status flips.
 *
 *   New UI states added:
 *     • Voted → shows which way the connected wallet voted (individual feedback).
 *     • Not yet contributed → explains they need to contribute to gain voting rights.
 *
 * MANDATE 4 — Evidence Input Validation:
 *   Before calling the smart contract, both inputs are validated with regex:
 *     IPFS hash: /^(Qm[a-zA-Z0-9]{44}|b[a-zA-Z0-9]{40,})$/
 *     GitHub URL: /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/
 *   If either fails, a red error message is shown BELOW the input and the
 *   form submission is blocked — no blockchain transaction is initiated.
 *   Errors clear as soon as the user edits the field.
 */

import { useState, useRef } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import {
  FiUpload, FiExternalLink, FiCheckCircle, FiXCircle,
  FiClock, FiUsers, FiFlag, FiArrowDown, FiAlertCircle,
} from "react-icons/fi";
import { uploadToIPFS } from "../../utils/ipfs";
import { useContract } from "../../hooks/useContract";
import { useWaterfallMilestones } from "../../hooks/useWaterfallMilestones";
import { STATUS_LABELS } from "../../constants";

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

// ── MANDATE 4: Validation regexes ────────────────────────────────────────────
const IPFS_REGEX = /^(Qm[a-zA-Z0-9]{44}|b[a-zA-Z0-9]{40,})$/;
const GITHUB_REGEX = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/;

const STATUS_COLOUR = {
  Pending: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  Submitted: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  Approved: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  Rejected: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  Released: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
  Refunded: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
};

const fmt = (wei) => {
  try { return parseFloat(ethers.utils.formatEther(wei || 0)).toFixed(4); }
  catch { return "0.0000"; }
};

const fmtBigInt = (wei) => {
  try { return parseFloat(ethers.utils.formatEther(wei.toString())).toFixed(4); }
  catch { return "0.0000"; }
};

// ─── MilestoneCard ────────────────────────────────────────────────────────────
function MilestoneCard({ milestone, campaignId, isCreator, index }) {
  const { address } = useAccount();
  const {
    useMyMilestoneContribution, useMyMilestoneVote,
    useSubmitEvidence, useVoteMilestone, useWithdrawMilestone, useClaimMilestoneRefund,
  } = useContract();

  const { data: myContrib } = useMyMilestoneContribution(campaignId, milestone.id);
  const { data: myVoteData } = useMyMilestoneVote(campaignId, milestone.id);

  const { write: submitEv, isLoading: submitting } = useSubmitEvidence();
  const { write: vote, isLoading: voting } = useVoteMilestone();
  const { write: withdraw, isLoading: withdrawing } = useWithdrawMilestone();
  const { write: claimRefund, isLoading: refunding } = useClaimMilestoneRefund();

  // ── Evidence form state ───────────────────────────────────────────────────
  const [ipfsHashManual, setIpfsHashManual] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploadingEv, setUploadingEv] = useState(false);
  const [showEvForm, setShowEvForm] = useState(false);

  // ── MANDATE 4: Per-field validation errors ────────────────────────────────
  const [ipfsError, setIpfsError] = useState("");
  const [urlError, setUrlError] = useState("");

  const fileInputRef = useRef(null);

  const statusLabel = STATUS_LABELS[Number(milestone.status)] ?? "Unknown";
  const { waterfallRaised, waterfallPercent } = milestone;
  const deadlineDt = new Date(Number(milestone.deadline) * 1000).toLocaleDateString();
  const hasContributed = myContrib && BigInt(myContrib.toString()) > 0n;

  // MANDATE 2: per-user vote state — reads wallet-specific votes[cId][mId][address]
  const hasVoted = myVoteData?.hasVoted === true;

  const totalVotes = Number(milestone.totalVotesFor || 0) + Number(milestone.totalVotesAgainst || 0);
  const approvalPct = totalVotes > 0
    ? Math.round((Number(milestone.totalVotesFor || 0) * 100) / totalVotes)
    : 0;

  // ── MANDATE 4: Validate inputs before calling the contract ────────────────
  const validateEvidence = (hash, url) => {
    let valid = true;

    if (hash.trim() && !IPFS_REGEX.test(hash.trim())) {
      setIpfsError("Invalid IPFS hash. Must be CIDv0 (Qm… 46 chars) or CIDv1 (b… 41+ chars).");
      valid = false;
    } else {
      setIpfsError("");
    }

    if (url.trim() && !GITHUB_REGEX.test(url.trim())) {
      setUrlError("Must be a valid GitHub URL — e.g. https://github.com/user/repo");
      valid = false;
    } else {
      setUrlError("");
    }

    return valid;
  };

  const handleEvidenceSubmit = async () => {
    let finalHash = ipfsHashManual.trim();

    // Optionally upload file to IPFS first
    if (evidenceFile) {
      setUploadingEv(true);
      try {
        const result = await uploadToIPFS(evidenceFile);
        if (result?.success) {
          finalHash = result.hash || result.IpfsHash || "";
          toast.success("File uploaded to IPFS!");
        } else {
          toast.error("IPFS upload failed — enter hash manually");
        }
      } catch (err) {
        toast.error("Upload error: " + err.message);
      } finally {
        setUploadingEv(false);
      }
    }

    // ── MANDATE 4: Block submission if validation fails ────────────────────
    if (!validateEvidence(finalHash, evidenceUrl)) return;

    if (!finalHash && !evidenceUrl.trim()) {
      return toast.error("Provide an IPFS hash or a GitHub evidence URL");
    }

    submitEv({ args: [campaignId, milestone.id, finalHash, evidenceUrl.trim()] });
    setShowEvForm(false);
    setIpfsHashManual("");
    setEvidenceUrl("");
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700/40 rounded-xl p-5 mb-4 bg-white dark:bg-slate-800/30 shadow-sm dark:shadow-none">

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30">
              {index + 1}
            </span>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
              {milestone.title}
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 pl-7">
            Deadline: {deadlineDt} · {milestone.contributorsCount?.toString() ?? "0"} Backers
          </p>
        </div>
        <span className={"shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full " + (STATUS_COLOUR[statusLabel] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400")}>
          {statusLabel}
        </span>
      </div>

      <p className="text-slate-700 dark:text-slate-400 text-sm mb-4 leading-relaxed pl-7">
        {milestone.description}
      </p>

      {/* Waterfall progress bar */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-slate-700 dark:text-slate-400 font-medium">
            {fmtBigInt(waterfallRaised)} ETH raised
          </span>
          <span className="text-slate-500">
            Target: {fmt(milestone.targetAmount)} ETH ·{" "}
            <span className={`font-semibold ${waterfallPercent === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
              {waterfallPercent}%
            </span>
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700/40 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-700"
            style={{ width: waterfallPercent + "%" }}
          />
        </div>
        {waterfallPercent > 0 && waterfallPercent < 100 && (
          <p className="text-[10px] text-slate-400 italic">
            Calculated from total campaign funds via waterfall model
          </p>
        )}
      </div>

      {/* Evidence links */}
      {["Submitted", "Approved", "Rejected", "Released"].includes(statusLabel) &&
        (milestone.evidenceIpfsHash || milestone.evidenceUrl) && (
          <div className="flex flex-wrap gap-3 mb-4">
            {milestone.evidenceIpfsHash && (
              <a href={IPFS_GATEWAY + milestone.evidenceIpfsHash} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                <FiExternalLink className="w-3 h-3" /> IPFS Evidence
              </a>
            )}
            {milestone.evidenceUrl && (
              <a href={milestone.evidenceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                <FiExternalLink className="w-3 h-3" /> Evidence URL
              </a>
            )}
          </div>
        )}

      {/* DAO vote tally */}
      {["Submitted", "Approved", "Rejected"].includes(statusLabel) && totalVotes > 0 && (
        <div className="bg-slate-50 border border-slate-200 dark:bg-slate-700/20 dark:border-slate-700/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FiUsers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              DAO Votes — {approvalPct}% Approval
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: approvalPct + "%" }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-500 mt-1.5">
            <span className="flex items-center gap-1">
              <FiCheckCircle className="w-3 h-3 text-emerald-500" />
              {milestone.totalVotesFor?.toString()} For
            </span>
            <span className="flex items-center gap-1">
              <FiXCircle className="w-3 h-3 text-red-400" />
              {milestone.totalVotesAgainst?.toString()} Against
            </span>
          </div>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-700/30 space-y-3">

        {/* Waterfall hint — replaces the old Fund Milestone button */}
        {statusLabel === "Pending" && !isCreator && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 rounded-lg px-3 py-2.5">
            <FiArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed">
              To fund this milestone, use the <strong>Contribute Now</strong> button at
              the top of this page. Funds fill milestones automatically in sequence.
            </p>
          </div>
        )}

        {/*
          MANDATE 2 FIX — Per-user voting UI.
          The condition now reads `hasVoted` which is backed by the per-user
          votes[cId][mId][connectedWallet] mapping.
          One backer voting no longer affects hasVoted for any other wallet.
        */}

        {/* Backer: not yet contributed — explain why they can't vote */}
        {statusLabel === "Submitted" && !isCreator && !hasContributed && (
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
            <FiAlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            You need to contribute to this campaign to participate in the DAO vote.
          </p>
        )}

        {/* Backer: has contributed, hasn't voted yet — show vote buttons */}
        {statusLabel === "Submitted" && !isCreator && hasContributed && !hasVoted && (
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-500 mb-2">
              You contributed {fmt(myContrib)} ETH — cast your DAO vote:
            </p>
            <div className="flex gap-2">
              <button
                disabled={voting}
                onClick={() => vote({ args: [campaignId, milestone.id, true] })}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
              >
                <FiCheckCircle className="w-3.5 h-3.5" />
                {voting ? "Voting…" : "Approve"}
              </button>
              <button
                disabled={voting}
                onClick={() => vote({ args: [campaignId, milestone.id, false] })}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
              >
                <FiXCircle className="w-3.5 h-3.5" />
                {voting ? "Voting…" : "Reject"}
              </button>
            </div>
          </div>
        )}

        {/* Backer: already voted — show THEIR individual outcome */}
        {statusLabel === "Submitted" && !isCreator && hasContributed && hasVoted && (
          <p className="text-sm text-slate-700 dark:text-slate-400 flex items-center gap-1.5">
            <FiCheckCircle className="w-4 h-4 text-emerald-500" />
            You voted to <strong className="ml-1">{myVoteData?.inFavour ? "approve" : "reject"}</strong> this milestone.
          </p>
        )}

        {/* Backer: claim refund on rejected milestone */}
        {statusLabel === "Rejected" && !isCreator && hasContributed && (
          <button
            disabled={refunding}
            onClick={() => claimRefund({ args: [campaignId, milestone.id] })}
            className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          >
            {refunding ? "Processing…" : "Claim Refund"}
          </button>
        )}

        {/* Creator: submit evidence form */}
        {isCreator && statusLabel === "Pending" && (
          <div>
            {!showEvForm ? (
              <button
                onClick={() => setShowEvForm(true)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-transparent px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Submit Completion Evidence
              </button>
            ) : (
              <div className="bg-slate-50 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700/40 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-300">
                  Submit Evidence for Oracle / DAO Review
                </p>

                {/* File upload */}
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide">
                    Upload File to IPFS (optional)
                  </label>
                  <div
                    className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3 text-center cursor-pointer hover:border-emerald-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FiUpload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs text-slate-500">
                      {evidenceFile ? evidenceFile.name : "Click to choose file"}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => setEvidenceFile(e.target.files[0] || null)}
                    />
                  </div>
                </div>

                {/* ── MANDATE 4: IPFS hash input with regex validation ─── */}
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide">
                    IPFS Hash (manual)
                  </label>
                  <input
                    type="text"
                    placeholder="Qm…"
                    value={ipfsHashManual}
                    onChange={(e) => {
                      setIpfsHashManual(e.target.value);
                      // Clear error on edit — live feedback
                      if (ipfsError) setIpfsError("");
                    }}
                    className={`w-full border rounded-lg p-2 text-sm text-slate-900 dark:text-white focus:ring-1 outline-none transition-colors ${ipfsError
                      ? "border-red-400 dark:border-red-500 focus:ring-red-400 bg-red-50 dark:bg-red-900/10"
                      : "border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 focus:ring-emerald-500/60"
                      }`}
                  />
                  {/* MANDATE 4: Red error message */}
                  {ipfsError && (
                    <p className="flex items-start gap-1 mt-1 text-[11px] text-red-500 dark:text-red-400">
                      <FiAlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      {ipfsError}
                    </p>
                  )}
                </div>

                {/* ── MANDATE 4: GitHub URL input with regex validation ── */}
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide">
                    Evidence URL (GitHub)
                  </label>
                  <input
                    type="text"
                    placeholder="https://github.com/user/repo"
                    value={evidenceUrl}
                    onChange={(e) => {
                      setEvidenceUrl(e.target.value);
                      if (urlError) setUrlError("");
                    }}
                    className={`w-full border rounded-lg p-2 text-sm text-slate-900 dark:text-white focus:ring-1 outline-none transition-colors ${urlError
                      ? "border-red-400 dark:border-red-500 focus:ring-red-400 bg-red-50 dark:bg-red-900/10"
                      : "border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 focus:ring-emerald-500/60"
                      }`}
                  />
                  {/* MANDATE 4: Red error message */}
                  {urlError && (
                    <p className="flex items-start gap-1 mt-1 text-[11px] text-red-500 dark:text-red-400">
                      <FiAlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      {urlError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    disabled={submitting || uploadingEv}
                    onClick={handleEvidenceSubmit}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
                  >
                    {uploadingEv ? "Uploading…" : submitting ? "Submitting…" : "Submit to Blockchain"}
                  </button>
                  <button
                    onClick={() => {
                      setShowEvForm(false);
                      setIpfsError("");
                      setUrlError("");
                    }}
                    className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Creator: waiting for verdict */}
        {isCreator && statusLabel === "Submitted" && (
          <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <FiClock className="w-4 h-4" />
            Evidence submitted. Awaiting Oracle verification or DAO quorum.
          </p>
        )}

        {/* Creator: withdraw approved funds */}
        {isCreator && statusLabel === "Approved" && !milestone.fundsReleased && (
          <button
            disabled={withdrawing}
            onClick={() => withdraw({ args: [campaignId, milestone.id] })}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          >
            {withdrawing ? "Releasing…" : "Withdraw Milestone Funds"}
          </button>
        )}

        {/* Released */}
        {statusLabel === "Released" && (
          <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <FiCheckCircle className="w-4 h-4 text-emerald-500" />
            Funds have been released to the creator.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── MilestonePanel ───────────────────────────────────────────────────────────
export default function MilestonePanel({ campaignId, creatorAddress, campaignRaisedAmount }) {
  const { address, useCampaignMilestones } = useContract();
  const { data: rawMilestones, isLoading } = useCampaignMilestones(campaignId);
  const isCreator = address?.toLowerCase() === creatorAddress?.toLowerCase();

  const milestones = useWaterfallMilestones(rawMilestones, campaignRaisedAmount);

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2].map((i) => (
          <div key={i} className="border border-slate-200 dark:border-slate-700/40 rounded-xl p-5 animate-pulse bg-slate-50 dark:bg-slate-800/20">
            <div className="h-3.5 bg-slate-200 dark:bg-slate-700/60 rounded w-1/3 mb-3" />
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700/40 rounded w-full mb-2" />
            <div className="h-2 bg-slate-100 dark:bg-slate-700/30 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!milestones || milestones.length === 0) {
    return (
      <div className="text-center py-8">
        <FiFlag className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 opacity-50" />
        <p className="text-sm text-slate-500 dark:text-slate-600">
          No milestones have been set up for this campaign yet.
        </p>
      </div>
    );
  }

  return (
    <section className="mt-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-0.5 h-5 bg-emerald-500/60 rounded-full" />
        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
          Project Milestones ({milestones.length})
        </h3>
      </div>
      {milestones.map((m, i) => (
        <MilestoneCard
          key={m.id.toString()}
          milestone={m}
          campaignId={campaignId}
          isCreator={isCreator}
          index={i}
        />
      ))}
    </section>
  );
}
