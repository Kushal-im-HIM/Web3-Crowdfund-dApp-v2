/**
 * MilestonePanel.js
 *
 * Issue 5 FIX — Complete restyle to a subtle, cohesive dark-mode palette:
 *   • Removed heavy bg-gray-700 / bg-white card contrast that clashed with the
 *     surrounding dark background.
 *   • Cards now use bg-slate-800/40 + border-slate-700/40 (semi-transparent,
 *     blends into the page background rather than floating on top of it).
 *   • Progress bar shifted from indigo-500 to emerald-500 to match app accent.
 *   • Status badges recoloured to match the softer palette.
 *   • Action buttons use the emerald / slate family consistently.
 *   • All logic, data-flow and contract interactions are preserved unchanged.
 */

import { useState, useRef } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import {
  FiUpload, FiExternalLink, FiCheckCircle, FiXCircle,
  FiClock, FiUsers, FiFlag,
} from "react-icons/fi";
import { uploadToIPFS } from "../../utils/ipfs";
import { useContract } from "../../hooks/useContract";
import { STATUS_LABELS } from "../../constants";

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

// Issue 5 FIX: subtle status badges instead of heavy coloured pills
const STATUS_COLOUR = {
  Pending: "bg-amber-500/10  text-amber-400  border border-amber-500/20",
  Submitted: "bg-blue-500/10   text-blue-400   border border-blue-500/20",
  Approved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Rejected: "bg-red-500/10    text-red-400    border border-red-500/20",
  Released: "bg-slate-500/10  text-slate-400  border border-slate-500/20",
  Refunded: "bg-slate-500/10  text-slate-400  border border-slate-500/20",
};

const fmt = (wei) => {
  try { return parseFloat(ethers.utils.formatEther(wei || 0)).toFixed(4); }
  catch { return "0.0000"; }
};

const pct = (raised, target) => {
  if (!target || BigInt(target.toString()) === 0n) return 0;
  return Math.min(100, Math.round((Number(raised) * 100) / Number(target)));
};

// ─── MilestoneCard ────────────────────────────────────────────────────────────
function MilestoneCard({ milestone, campaignId, isCreator }) {
  const { address } = useAccount();
  const {
    useMyMilestoneContribution, useMyMilestoneVote,
    useContributeToMilestone, useSubmitEvidence,
    useVoteMilestone, useWithdrawMilestone, useClaimMilestoneRefund,
  } = useContract();

  const { data: myContrib } = useMyMilestoneContribution(campaignId, milestone.id);
  const { data: myVoteData } = useMyMilestoneVote(campaignId, milestone.id);

  const { write: contribute, isLoading: contributing } = useContributeToMilestone();
  const { write: submitEv, isLoading: submitting } = useSubmitEvidence();
  const { write: vote, isLoading: voting } = useVoteMilestone();
  const { write: withdraw, isLoading: withdrawing } = useWithdrawMilestone();
  const { write: claimRefund, isLoading: refunding } = useClaimMilestoneRefund();

  const [contribEth, setContribEth] = useState("");
  const [ipfsHashManual, setIpfsHashManual] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploadingEv, setUploadingEv] = useState(false);
  const [showEvForm, setShowEvForm] = useState(false);
  const fileInputRef = useRef(null);

  const statusLabel = STATUS_LABELS[Number(milestone.status)] ?? "Unknown";
  const progress = pct(milestone.raisedAmount, milestone.targetAmount);
  const deadlineDt = new Date(Number(milestone.deadline) * 1000).toLocaleDateString();
  const hasContributed = myContrib && BigInt(myContrib.toString()) > 0n;
  const hasVoted = myVoteData?.hasVoted === true;

  const totalVotes = Number(milestone.totalVotesFor || 0) + Number(milestone.totalVotesAgainst || 0);
  const approvalPct = totalVotes > 0
    ? Math.round((Number(milestone.totalVotesFor || 0) * 100) / totalVotes)
    : 0;

  const handleEvidenceSubmit = async () => {
    let finalHash = ipfsHashManual.trim();
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
    if (!finalHash && !evidenceUrl.trim()) {
      return toast.error("Provide an IPFS hash or evidence URL");
    }
    submitEv({ args: [campaignId, milestone.id, finalHash, evidenceUrl.trim()] });
    setShowEvForm(false);
  };

  // Remaining allowance for contribution cap display
  const remainingMs = Math.max(
    0,
    parseFloat(ethers.utils.formatEther(milestone.targetAmount || 0)) -
    parseFloat(ethers.utils.formatEther(milestone.raisedAmount || 0))
  );

  return (
    // Issue 5 FIX: card uses transparent slate background that blends with the page
    <div className="border border-slate-700/40 rounded-xl p-5 mb-4 bg-slate-800/30 backdrop-blur-sm">

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="font-semibold text-base text-white truncate">{milestone.title}</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Deadline: {deadlineDt} · {milestone.contributorsCount?.toString() ?? "0"} Backers
          </p>
        </div>
        <span className={"shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full " + (STATUS_COLOUR[statusLabel] ?? "bg-slate-700 text-slate-400")}>
          {statusLabel}
        </span>
      </div>

      <p className="text-slate-400 text-sm mb-4">{milestone.description}</p>

      {/* Funding progress */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{fmt(milestone.raisedAmount)} ETH raised</span>
          <span>Target: {fmt(milestone.targetAmount)} ETH · {progress}%</span>
        </div>
        {/* Issue 5 FIX: emerald progress bar instead of indigo, subtle track */}
        <div className="w-full bg-slate-700/40 rounded-full h-1.5">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: progress + "%" }}
          />
        </div>
      </div>

      {/* Evidence links */}
      {["Submitted", "Approved", "Rejected", "Released"].includes(statusLabel) &&
        (milestone.evidenceIpfsHash || milestone.evidenceUrl) && (
          <div className="flex flex-wrap gap-3 mb-4">
            {milestone.evidenceIpfsHash && (
              <a href={IPFS_GATEWAY + milestone.evidenceIpfsHash} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors">
                <FiExternalLink className="w-3 h-3" /> IPFS Evidence
              </a>
            )}
            {milestone.evidenceUrl && (
              <a href={milestone.evidenceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors">
                <FiExternalLink className="w-3 h-3" /> Evidence URL
              </a>
            )}
          </div>
        )}

      {/* DAO vote tally */}
      {["Submitted", "Approved", "Rejected"].includes(statusLabel) && totalVotes > 0 && (
        <div className="bg-slate-700/20 border border-slate-700/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FiUsers className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              DAO Votes — {approvalPct}% Approval
            </span>
          </div>
          <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: approvalPct + "%" }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
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

      {/* Actions */}
      <div className="pt-3 border-t border-slate-700/30 space-y-3">

        {/* Backer: fund milestone */}
        {statusLabel === "Pending" && !isCreator && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Remaining: <span className="text-slate-300 font-medium">{remainingMs.toFixed(4)} ETH</span>
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.001" min="0.001" max={remainingMs.toFixed(6)}
                placeholder="0.1 ETH"
                value={contribEth}
                onChange={(e) => setContribEth(e.target.value)}
                className="border border-slate-600/50 bg-slate-900/50 rounded-lg p-2 text-sm w-32 text-white focus:ring-1 focus:ring-emerald-500/60 outline-none"
              />
              <button
                disabled={contributing || !contribEth || remainingMs <= 0}
                onClick={() => {
                  const parsed = parseFloat(contribEth || "0");
                  const finalEth = Math.min(parsed, remainingMs);
                  if (finalEth <= 0) return;
                  contribute({ args: [campaignId, milestone.id], value: ethers.utils.parseEther(finalEth.toFixed(18)) });
                }}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed transition-colors"
              >
                {contributing ? "Processing…" : "Fund Milestone"}
              </button>
            </div>
          </div>
        )}

        {/* Backer: vote */}
        {statusLabel === "Submitted" && !isCreator && hasContributed && !hasVoted && (
          <div>
            <p className="text-xs text-slate-500 mb-2">
              You contributed {fmt(myContrib)} ETH — cast your DAO vote:
            </p>
            <div className="flex gap-2">
              <button
                disabled={voting}
                onClick={() => vote({ args: [campaignId, milestone.id, true] })}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
              >
                <FiCheckCircle className="w-3.5 h-3.5" />
                {voting ? "Voting…" : "Approve"}
              </button>
              <button
                disabled={voting}
                onClick={() => vote({ args: [campaignId, milestone.id, false] })}
                className="flex items-center gap-1.5 bg-red-700/80 hover:bg-red-700 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
              >
                <FiXCircle className="w-3.5 h-3.5" />
                {voting ? "Voting…" : "Reject"}
              </button>
            </div>
          </div>
        )}

        {/* Backer: already voted */}
        {statusLabel === "Submitted" && !isCreator && hasContributed && hasVoted && (
          <p className="text-sm text-slate-400 flex items-center gap-1.5">
            <FiCheckCircle className="w-4 h-4 text-emerald-500" />
            You voted to {myVoteData?.inFavour ? "approve" : "reject"} this milestone.
          </p>
        )}

        {/* Backer: claim refund */}
        {statusLabel === "Rejected" && !isCreator && hasContributed && (
          <button
            disabled={refunding}
            onClick={() => claimRefund({ args: [campaignId, milestone.id] })}
            className="bg-amber-600/80 hover:bg-amber-600 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          >
            {refunding ? "Processing…" : "Claim Refund"}
          </button>
        )}

        {/* Creator: submit evidence */}
        {isCreator && statusLabel === "Pending" && (
          <div>
            {!showEvForm ? (
              <button
                onClick={() => setShowEvForm(true)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Submit Completion Evidence
              </button>
            ) : (
              <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-300">Submit Evidence for Oracle / DAO Review</p>

                {/* File upload */}
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide">Upload File to IPFS (optional)</label>
                  <div
                    className="border border-dashed border-slate-600 rounded-lg p-3 text-center cursor-pointer hover:border-slate-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FiUpload className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                    <span className="text-xs text-slate-500">
                      {evidenceFile ? evidenceFile.name : "Click to choose file"}
                    </span>
                    <input ref={fileInputRef} type="file" className="hidden"
                      onChange={(e) => setEvidenceFile(e.target.files[0] || null)} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide">IPFS Hash (manual)</label>
                  <input type="text" placeholder="Qm…" value={ipfsHashManual}
                    onChange={(e) => setIpfsHashManual(e.target.value)}
                    className="w-full border border-slate-600/50 bg-slate-900/50 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/60 outline-none" />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide">Evidence URL</label>
                  <input type="url" placeholder="https://…" value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    className="w-full border border-slate-600/50 bg-slate-900/50 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/60 outline-none" />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    disabled={submitting || uploadingEv}
                    onClick={handleEvidenceSubmit}
                    className="flex-1 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
                  >
                    {uploadingEv ? "Uploading…" : submitting ? "Submitting…" : "Submit to Blockchain"}
                  </button>
                  <button
                    onClick={() => setShowEvForm(false)}
                    className="px-4 py-2 rounded-lg text-sm border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors"
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
          <p className="text-sm text-slate-400 flex items-center gap-1.5">
            <FiClock className="w-4 h-4" />
            Evidence submitted. Awaiting Oracle verification or DAO quorum.
          </p>
        )}

        {/* Creator: withdraw approved funds */}
        {isCreator && statusLabel === "Approved" && !milestone.fundsReleased && (
          <button
            disabled={withdrawing}
            onClick={() => withdraw({ args: [campaignId, milestone.id] })}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          >
            {withdrawing ? "Releasing…" : "Withdraw Milestone Funds"}
          </button>
        )}

        {/* Released */}
        {statusLabel === "Released" && (
          <p className="text-sm text-slate-400 flex items-center gap-1.5">
            <FiCheckCircle className="w-4 h-4 text-emerald-500" />
            Funds have been released to the creator.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── MilestonePanel ───────────────────────────────────────────────────────────
export default function MilestonePanel({ campaignId, creatorAddress }) {
  const { address, useCampaignMilestones } = useContract();
  const { data: milestones, isLoading } = useCampaignMilestones(campaignId);
  const isCreator = address?.toLowerCase() === creatorAddress?.toLowerCase();

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2].map((i) => (
          <div key={i} className="border border-slate-700/40 rounded-xl p-5 animate-pulse bg-slate-800/20">
            <div className="h-3.5 bg-slate-700/60 rounded w-1/3 mb-3" />
            <div className="h-2.5 bg-slate-700/40 rounded w-full mb-2" />
            <div className="h-1.5 bg-slate-700/30 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!milestones || milestones.length === 0) {
    return (
      <div className="text-center py-8 text-slate-600">
        <FiFlag className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No milestones have been set up for this campaign yet.</p>
      </div>
    );
  }

  return (
    <section className="mt-4">
      {/* Issue 5 FIX: subtle section header — thin accent line instead of heavy title */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-0.5 h-5 bg-emerald-500/60 rounded-full" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
          Project Milestones ({milestones.length})
        </h3>
      </div>
      {milestones.map((m) => (
        <MilestoneCard
          key={m.id.toString()}
          milestone={m}
          campaignId={campaignId}
          isCreator={isCreator}
        />
      ))}
    </section>
  );
}
