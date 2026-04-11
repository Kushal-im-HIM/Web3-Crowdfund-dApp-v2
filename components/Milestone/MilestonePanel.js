/**
 * components/Milestone/MilestonePanel.js
 *
 * FIX — Voting Error Handling & Race Condition UX
 *
 * Problem 1 — Raw MetaMask popup on "Voting not open"
 *   handleVote() now runs a series of CLIENT-SIDE pre-flight checks BEFORE
 *   sending any tx. If any check fails, a friendly toast() is shown and the
 *   transaction is never sent. The raw MetaMask error box is never seen.
 *
 *   Checks (in order):
 *     1. statusLabel !== "Submitted" → toast explaining current status
 *     2. votingWindowExpired         → tell user to click Finalize Vote instead
 *     3. hasVoted                    → "you already voted"
 *     4. !hasContributed             → "only contributors can vote"
 *
 * Problem 2 — Live voting window countdown
 *   Every Submitted milestone now shows a real-time countdown ("6d 23h 11m")
 *   so donors know exactly how long they have. It turns amber at < 1 hour,
 *   red when expired.
 *
 * Problem 3 — Stale page state
 *   When another wallet's tx resolves a milestone between page load and click,
 *   the UI still shows vote buttons because wagmi's cache hasn't refreshed.
 *   The pre-flight status check catches this and tells the user to refresh
 *   instead of sending a doomed transaction.
 *
 * Problem 4 — All write calls have friendly onError handlers
 *   extractRevertReason() strips viem boilerplate and surfaces only the
 *   human-readable contract revert string in a toast.
 */

import { useState, useRef, useEffect } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import {
  FiUpload, FiExternalLink, FiCheckCircle, FiXCircle,
  FiClock, FiUsers, FiFlag, FiArrowDown, FiAlertCircle,
  FiZap, FiRefreshCw, FiInfo,
} from "react-icons/fi";
import { uploadToIPFS } from "../../utils/ipfs";
import { useContract } from "../../hooks/useContract";
import { useWaterfallMilestones } from "../../hooks/useWaterfallMilestones";
import { STATUS_LABELS } from "../../constants";

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";
// Must match the contract's default votingWindowSeconds (7 days)
const VOTING_WINDOW_SECONDS = 7 * 24 * 3600;

const IPFS_REGEX = /^(Qm[a-zA-Z0-9]{44}|b[a-zA-Z0-9]{40,})$/;
const GITHUB_REGEX = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/;

const STATUS_COLOUR = {
  Pending: "bg-amber-50  text-amber-700  border border-amber-200  dark:bg-amber-500/10  dark:text-amber-400  dark:border-amber-500/20",
  Submitted: "bg-blue-50   text-blue-700   border border-blue-200   dark:bg-blue-500/10   dark:text-blue-400   dark:border-blue-500/20",
  Approved: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  Rejected: "bg-red-50    text-red-700    border border-red-200    dark:bg-red-500/10    dark:text-red-400    dark:border-red-500/20",
  Released: "bg-slate-100 text-slate-600  border border-slate-200  dark:bg-slate-500/10  dark:text-slate-400  dark:border-slate-500/20",
  Refunded: "bg-slate-100 text-slate-600  border border-slate-200  dark:bg-slate-500/10  dark:text-slate-400  dark:border-slate-500/20",
};

const fmt = (wei) => {
  try { return parseFloat(ethers.utils.formatEther(wei || 0)).toFixed(4); }
  catch { return "0.0000"; }
};
const fmtBigInt = (wei) => {
  try { return parseFloat(ethers.utils.formatEther(wei.toString())).toFixed(4); }
  catch { return "0.0000"; }
};

/** Pull the human-readable revert reason out of a wagmi/viem error. */
function extractRevertReason(err) {
  const raw = err?.cause?.reason
    || err?.reason
    || err?.data?.message
    || err?.message
    || "Transaction failed";

  // Strip viem wrapper text so only the reason shows
  const m = raw.match(/reason:\s*"?([^"\\n]+)"?/i)
    || raw.match(/reverted with the following reason:\s*(.+)/i);
  if (m) return m[1].trim();

  if (/user rejected|user denied/i.test(raw))
    return "You rejected the transaction in MetaMask.";

  return raw.length > 140 ? raw.slice(0, 140) + "…" : raw;
}

// ── Live countdown ────────────────────────────────────────────────────────────
function useCountdown(targetTs) {
  const calc = () => Math.max(0, targetTs - Math.floor(Date.now() / 1000));
  const [s, setS] = useState(calc);
  useEffect(() => {
    if (s <= 0) return;
    const id = setInterval(() => setS(calc()), 1000);
    return () => clearInterval(id);
  }, [targetTs]);
  return s;
}

function fmtDuration(s) {
  if (s <= 0) return "Expired";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

// ─── MilestoneCard ────────────────────────────────────────────────────────────
function MilestoneCard({ milestone, campaignId, isCreator, index }) {
  const { address } = useAccount();
  const {
    useMyMilestoneContribution, useMyMilestoneVote,
    useSubmitEvidence, useVoteMilestone, useWithdrawMilestone,
    useClaimMilestoneRefund, useFinalizeVoting,
  } = useContract();

  const { data: myContrib } = useMyMilestoneContribution(campaignId, milestone.id);
  const { data: myVoteData } = useMyMilestoneVote(campaignId, milestone.id);

  /** Returns a wagmi onError handler that shows a friendly toast. */
  const errHandler = (ctx) => (err) => {
    const reason = extractRevertReason(err);
    toast.error(`${ctx} failed: ${reason}`, { duration: 6000 });
    console.error(`[MilestonePanel:${ctx}]`, err);
  };

  const { write: submitEv, isLoading: submitting } = useSubmitEvidence();
  const { write: vote, isLoading: voting } = useVoteMilestone();
  const { write: withdraw, isLoading: withdrawing } = useWithdrawMilestone();
  const { write: claimRefund, isLoading: refunding } = useClaimMilestoneRefund();
  const { write: finalizeVote, isLoading: finalizing } = useFinalizeVoting();

  // Evidence form state
  const [ipfsHashManual, setIpfsHashManual] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploadingEv, setUploadingEv] = useState(false);
  const [showEvForm, setShowEvForm] = useState(false);
  const [ipfsError, setIpfsError] = useState("");
  const [urlError, setUrlError] = useState("");
  const fileInputRef = useRef(null);

  const statusLabel = STATUS_LABELS[Number(milestone.status)] ?? "Unknown";
  const { waterfallRaised, waterfallPercent } = milestone;
  const deadlineDt = new Date(Number(milestone.deadline) * 1000).toLocaleDateString();
  const hasContributed = myContrib && BigInt(myContrib.toString()) > 0n;
  const hasVoted = myVoteData?.hasVoted === true;

  // Voting window
  const votingWindowEnd = Number(milestone.deadline) + VOTING_WINDOW_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  const votingWindowExpired = now >= votingWindowEnd;
  const secondsLeft = useCountdown(votingWindowEnd);

  // Vote totals
  const votesFor = BigInt((milestone.totalVotesFor || 0).toString());
  const votesAgainst = BigInt((milestone.totalVotesAgainst || 0).toString());
  const totalVotesWei = votesFor + votesAgainst;
  const approvalPct = totalVotesWei > 0n
    ? Math.round((Number(votesFor) * 100) / Number(totalVotesWei))
    : 0;

  // ── Pre-flight vote guard ─────────────────────────────────────────────────
  const handleVote = (inFavour) => {
    // 1. Status guard — catches stale UI where another wallet already resolved
    if (statusLabel !== "Submitted") {
      const msgs = {
        Approved: "✅ This milestone was already approved — no more votes accepted.",
        Rejected: "❌ This milestone was already rejected — you can claim a refund.",
        Pending: "Evidence hasn't been submitted yet. Voting hasn't started.",
        Released: "This milestone's funds have already been released.",
        Refunded: "This milestone's funds have already been refunded.",
      };
      toast(msgs[statusLabel] || `Voting is not open (status: ${statusLabel}).`, {
        icon: "ℹ️", duration: 5000,
      });
      return;
    }

    // 2. Window guard — voting window may have closed since page load
    if (votingWindowExpired) {
      toast.error(
        "The voting window has closed. Use \"Finalize Vote\" to settle this milestone on-chain.",
        { duration: 6000 }
      );
      return;
    }

    // 3. Duplicate vote guard
    if (hasVoted) {
      toast("You have already cast your vote on this milestone.", { icon: "ℹ️" });
      return;
    }

    // 4. Contribution guard
    if (!hasContributed) {
      toast.error("Only contributors can vote. You have no contribution in this campaign.");
      return;
    }

    // All guards passed — send tx with friendly error handler
    vote({
      args: [campaignId, milestone.id, inFavour],
      onError: errHandler("Vote"),
    });
  };

  // ── Evidence validation ───────────────────────────────────────────────────
  const validateEvidence = (hash, url) => {
    let ok = true;
    if (hash.trim() && !IPFS_REGEX.test(hash.trim())) {
      setIpfsError("Invalid IPFS hash — must be CIDv0 (Qm…, 46 chars) or CIDv1 (b…, 41+ chars).");
      ok = false;
    } else { setIpfsError(""); }
    if (url.trim() && !GITHUB_REGEX.test(url.trim())) {
      setUrlError("Must be a valid GitHub URL — e.g. https://github.com/user/repo");
      ok = false;
    } else { setUrlError(""); }
    return ok;
  };

  const hasValidationErrors = Boolean(ipfsError || urlError);

  const handleEvidenceSubmit = async () => {
    const hash = ipfsHashManual.trim();
    const url = evidenceUrl.trim();
    if (!validateEvidence(hash, url)) return;
    if (!hash && !url && !evidenceFile)
      return toast.error("Provide an IPFS hash, a GitHub URL, or upload a file.");

    let finalHash = hash;
    if (evidenceFile) {
      setUploadingEv(true);
      try {
        const res = await uploadToIPFS(evidenceFile);
        if (res?.success) {
          finalHash = res.hash || res.IpfsHash || "";
          toast.success("File uploaded to IPFS!");
          if (finalHash && !IPFS_REGEX.test(finalHash)) {
            setIpfsError("IPFS returned an unrecognised hash — enter it manually.");
            return;
          }
        } else {
          toast.error("IPFS upload failed — enter the hash manually.");
          return;
        }
      } catch (err) {
        toast.error("Upload error: " + err.message);
        return;
      } finally { setUploadingEv(false); }
    }

    if (!finalHash && !url)
      return toast.error("Provide an IPFS hash or a GitHub evidence URL.");

    submitEv({
      args: [campaignId, milestone.id, finalHash, url],
      onError: errHandler("Submit Evidence"),
    });
    setShowEvForm(false);
    setIpfsHashManual("");
    setEvidenceUrl("");
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700/40 rounded-xl p-5 mb-4 bg-white dark:bg-slate-800/30 shadow-sm">

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
        <span className={"shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full " + (STATUS_COLOUR[statusLabel] ?? "bg-slate-100 text-slate-600")}>
          {statusLabel}
        </span>
      </div>

      <p className="text-slate-700 dark:text-slate-400 text-sm mb-4 leading-relaxed pl-7">
        {milestone.description}
      </p>

      {/* Waterfall progress */}
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
          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-700" style={{ width: waterfallPercent + "%" }} />
        </div>
      </div>

      {/* ── Live voting window countdown ── */}
      {statusLabel === "Submitted" && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-xs font-medium border ${votingWindowExpired
            ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 text-red-700 dark:text-red-400"
            : secondsLeft < 3600
              ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 text-amber-700 dark:text-amber-400"
              : "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 text-blue-700 dark:text-blue-400"
          }`}>
          <FiClock className="w-3.5 h-3.5 shrink-0" />
          {votingWindowExpired
            ? <span>Voting window closed — click <strong>Finalize Vote</strong> below to record the result on-chain.</span>
            : <span>Voting window closes in <strong>{fmtDuration(secondsLeft)}</strong>. All contributors should vote before then.</span>
          }
        </div>
      )}

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
      {["Submitted", "Approved", "Rejected"].includes(statusLabel) && totalVotesWei > 0n && (
        <div className="bg-slate-50 border border-slate-200 dark:bg-slate-700/20 dark:border-slate-700/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FiUsers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              DAO Votes — {approvalPct}% Approval (ETH stake-weighted)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: approvalPct + "%" }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-500 mt-1.5">
            <span className="flex items-center gap-1">
              <FiCheckCircle className="w-3 h-3 text-emerald-500" />
              {fmtBigInt(votesFor)} ETH For
            </span>
            <span className="flex items-center gap-1">
              <FiXCircle className="w-3 h-3 text-red-400" />
              {fmtBigInt(votesAgainst)} ETH Against
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 italic">
            Result is finalised when the window expires or all campaign stake has voted.
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-700/30 space-y-3">

        {/* Pending: waterfall hint for non-creators */}
        {statusLabel === "Pending" && !isCreator && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 rounded-lg px-3 py-2.5">
            <FiArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed">
              To fund this milestone, use the <strong>Contribute Now</strong> button at the top of this page.
              Funds fill milestones automatically in sequence.
            </p>
          </div>
        )}

        {/* Submitted: not a contributor */}
        {statusLabel === "Submitted" && !isCreator && !hasContributed && (
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
            <FiAlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            You haven&apos;t contributed to this campaign so you cannot vote.
          </p>
        )}

        {/* Submitted: contributor — voting info blurb */}
        {statusLabel === "Submitted" && !isCreator && hasContributed && !hasVoted && !votingWindowExpired && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700/40 rounded-lg">
            <FiInfo className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Your vote is weighted by your ETH contribution (<strong>{fmt(myContrib)} ETH</strong>).
              Voting stays open until the window closes — all contributors can vote before then.
              The result is only settled at window expiry via <strong>Finalize Vote</strong>, or
              immediately when all campaign stake has been cast.
            </p>
          </div>
        )}

        {/* Submitted: vote buttons — uses handleVote() with all pre-flight checks */}
        {statusLabel === "Submitted" && !isCreator && hasContributed && !hasVoted && !votingWindowExpired && (
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-500 mb-2">
              Cast your DAO vote ({fmt(myContrib)} ETH weight):
            </p>
            <div className="flex gap-2">
              <button disabled={voting} onClick={() => handleVote(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed">
                <FiCheckCircle className="w-3.5 h-3.5" />
                {voting ? "Submitting…" : "Approve"}
              </button>
              <button disabled={voting} onClick={() => handleVote(false)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed">
                <FiXCircle className="w-3.5 h-3.5" />
                {voting ? "Submitting…" : "Reject"}
              </button>
            </div>
          </div>
        )}

        {/* Submitted: already voted confirmation */}
        {statusLabel === "Submitted" && !isCreator && hasContributed && hasVoted && (
          <p className="text-sm text-slate-700 dark:text-slate-400 flex items-center gap-1.5">
            <FiCheckCircle className="w-4 h-4 text-emerald-500" />
            You voted to <strong className="ml-1">{myVoteData?.inFavour ? "approve ✅" : "reject ❌"}</strong> this milestone.
            {!votingWindowExpired && (
              <span className="text-slate-400 text-xs ml-1">
                ({fmtDuration(secondsLeft)} left for others)
              </span>
            )}
          </p>
        )}

        {/* Submitted: window expired — contributor didn't vote */}
        {statusLabel === "Submitted" && !isCreator && hasContributed && !hasVoted && votingWindowExpired && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
            <FiAlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
              The voting window closed before you voted — your stake won&apos;t count this round.
              Click <strong>Finalize Vote</strong> below to record the on-chain result.
            </p>
          </div>
        )}

        {/* Finalize Vote — anyone can call this after window expires */}
        {statusLabel === "Submitted" && votingWindowExpired && address && (
          <button
            disabled={finalizing}
            onClick={() => finalizeVote({
              args: [campaignId, milestone.id],
              onError: errHandler("Finalize Vote"),
            })}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          >
            <FiZap className="w-3.5 h-3.5" />
            {finalizing ? "Finalizing…" : "Finalize Vote"}
          </button>
        )}

        {/* Refresh hint after finalize */}
        {statusLabel === "Submitted" && votingWindowExpired && hasVoted && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <FiRefreshCw className="w-3 h-3" />
            After finalizing, refresh the page if the status doesn&apos;t update automatically.
          </p>
        )}

        {/* Claim Refund — ONLY on Rejected, never during Submitted */}
        {statusLabel === "Rejected" && !isCreator && hasContributed && (
          <button
            disabled={refunding}
            onClick={() => claimRefund({
              args: [campaignId, milestone.id],
              onError: errHandler("Claim Refund"),
            })}
            className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          >
            {refunding ? "Processing…" : "Claim Refund"}
          </button>
        )}

        {/* Creator: submit evidence */}
        {isCreator && statusLabel === "Pending" && (
          <div>
            {!showEvForm ? (
              <button onClick={() => setShowEvForm(true)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-transparent px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Submit Completion Evidence
              </button>
            ) : (
              <div className="bg-slate-50 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700/40 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-300">Submit Evidence for Oracle / DAO Review</p>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide">Upload File to IPFS (optional)</label>
                  <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3 text-center cursor-pointer hover:border-emerald-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}>
                    <FiUpload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs text-slate-500">{evidenceFile ? evidenceFile.name : "Click to choose file"}</span>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setEvidenceFile(e.target.files[0] || null)} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide">IPFS Hash (manual)</label>
                  <input type="text" placeholder="Qm…" value={ipfsHashManual}
                    onChange={(e) => { setIpfsHashManual(e.target.value); if (ipfsError) setIpfsError(""); }}
                    className={`w-full border rounded-lg p-2 text-sm text-slate-900 dark:text-white focus:ring-1 outline-none transition-colors ${ipfsError ? "border-red-400 focus:ring-red-400 bg-red-50 dark:bg-red-900/10" : "border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 focus:ring-emerald-500/60"}`}
                  />
                  {ipfsError && <p className="flex items-start gap-1 mt-1 text-[11px] text-red-500 dark:text-red-400"><FiAlertCircle className="w-3 h-3 shrink-0 mt-0.5" />{ipfsError}</p>}
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide">Evidence URL (GitHub)</label>
                  <input type="text" placeholder="https://github.com/user/repo" value={evidenceUrl}
                    onChange={(e) => { setEvidenceUrl(e.target.value); if (urlError) setUrlError(""); }}
                    className={`w-full border rounded-lg p-2 text-sm text-slate-900 dark:text-white focus:ring-1 outline-none transition-colors ${urlError ? "border-red-400 focus:ring-red-400 bg-red-50 dark:bg-red-900/10" : "border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 focus:ring-emerald-500/60"}`}
                  />
                  {urlError && <p className="flex items-start gap-1 mt-1 text-[11px] text-red-500 dark:text-red-400"><FiAlertCircle className="w-3 h-3 shrink-0 mt-0.5" />{urlError}</p>}
                </div>

                <div className="flex gap-2 pt-1">
                  <button disabled={submitting || uploadingEv || hasValidationErrors} onClick={handleEvidenceSubmit}
                    title={hasValidationErrors ? "Fix errors above before submitting" : undefined}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed">
                    {uploadingEv ? "Uploading to IPFS…" : submitting ? "Submitting…" : "Submit to Blockchain"}
                  </button>
                  <button onClick={() => { setShowEvForm(false); setIpfsError(""); setUrlError(""); }}
                    className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
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
            Awaiting Oracle or DAO settlement
            {!votingWindowExpired && <span className="text-xs text-slate-400 ml-1">({fmtDuration(secondsLeft)} left in window)</span>}.
          </p>
        )}

        {/* Creator: withdraw on Approved */}
        {isCreator && statusLabel === "Approved" && !milestone.fundsReleased && (
          <button disabled={withdrawing}
            onClick={() => withdraw({ args: [campaignId, milestone.id], onError: errHandler("Withdraw") })}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed">
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
