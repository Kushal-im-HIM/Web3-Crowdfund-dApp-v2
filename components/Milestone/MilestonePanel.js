import { useState, useRef } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import { FiUpload, FiExternalLink, FiCheckCircle, FiXCircle, FiClock, FiUsers } from "react-icons/fi";
import { uploadToIPFS } from "../../utils/ipfs";
import { useContract } from "../../hooks/useContract";
import { STATUS_LABELS } from "../../constants";

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

// 0=Pending 1=Submitted 2=Approved 3=Rejected 4=Released 5=Refunded
const STATUS_COLOUR = {
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Released: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  Refunded: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

const fmt = (wei) => {
  try { return parseFloat(ethers.utils.formatEther(wei || 0)).toFixed(4); }
  catch { return "0.0000"; }
};

const pct = (raised, target) => {
  if (!target || BigInt(target.toString()) === 0n) return 0;
  return Math.min(100, Math.round((Number(raised) * 100) / Number(target)));
};

function MilestoneCard({ milestone, campaignId, isCreator }) {
  const { address } = useAccount();
  const {
    useMyMilestoneContribution,
    useMyMilestoneVote,
    useContributeToMilestone,
    useSubmitEvidence,
    useVoteMilestone,
    useWithdrawMilestone,
    useClaimMilestoneRefund,
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
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const fileInputRef = useRef(null);

  const statusLabel = STATUS_LABELS[Number(milestone.status)] ?? "Unknown";
  const progress = pct(milestone.raisedAmount, milestone.targetAmount);
  const deadlineDt = new Date(Number(milestone.deadline) * 1000).toLocaleDateString();
  const hasContributed = myContrib && BigInt(myContrib.toString()) > 0n;
  const hasVoted = myVoteData?.hasVoted === true;

  const totalVotes = Number(milestone.totalVotesFor || 0) + Number(milestone.totalVotesAgainst || 0);
  const approvalPct = totalVotes > 0 ? Math.round((Number(milestone.totalVotesFor || 0) * 100) / totalVotes) : 0;

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
      toast.error("Please provide an IPFS hash or evidence URL");
      return;
    }
    submitEv({ args: [campaignId, milestone.id, finalHash, evidenceUrl.trim()] });
    setShowEvidenceForm(false);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-6 mb-5 bg-white dark:bg-gray-700 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="font-bold text-lg text-gray-900 dark:text-white truncate">{milestone.title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Deadline: {deadlineDt} · {milestone.contributorsCount?.toString() ?? "0"} Backers
          </p>
        </div>
        <span className={`shrink-0 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${STATUS_COLOUR[statusLabel] ?? "bg-gray-100 text-gray-600"}`}>
          {statusLabel}
        </span>
      </div>

      <p className="text-gray-600 dark:text-gray-300 text-sm mb-5">{milestone.description}</p>

      {/* Funding Progress */}
      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
          <span>{fmt(milestone.raisedAmount)} ETH raised</span>
          <span>Target: {fmt(milestone.targetAmount)} ETH · {progress}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
          <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Evidence links */}
      {["Submitted", "Approved", "Rejected", "Released"].includes(statusLabel) && (milestone.evidenceIpfsHash || milestone.evidenceUrl) && (
        <div className="flex flex-wrap gap-3 mb-5">
          {milestone.evidenceIpfsHash && (
            <a href={`${IPFS_GATEWAY}${milestone.evidenceIpfsHash}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              <FiExternalLink className="w-3.5 h-3.5" /> View IPFS Evidence
            </a>
          )}
          {milestone.evidenceUrl && (
            <a href={milestone.evidenceUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              <FiExternalLink className="w-3.5 h-3.5" /> View Evidence URL
            </a>
          )}
        </div>
      )}

      {/* DAO Vote Tally */}
      {["Submitted", "Approved", "Rejected"].includes(statusLabel) && totalVotes > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <FiUsers className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              DAO Votes — {approvalPct}% Approval
            </span>
          </div>
          <div className="w-full bg-red-100 dark:bg-red-900/30 rounded-full h-2.5 overflow-hidden">
            <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${approvalPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            <span className="flex items-center gap-1"><FiCheckCircle className="w-3 h-3 text-green-500" /> {milestone.totalVotesFor?.toString()} For</span>
            <span className="flex items-center gap-1"><FiXCircle className="w-3 h-3 text-red-500" /> {milestone.totalVotesAgainst?.toString()} Against</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">

        {/* Backer: fund */}
        {statusLabel === "Pending" && !isCreator && (
          <div className="flex flex-col gap-2">
            {/* FIX (Issue #3): Show remaining milestone allowance so users see the cap */}
            {(() => {
              const remainingMs = Math.max(
                0,
                parseFloat(ethers.utils.formatEther(milestone.targetAmount || 0)) -
                parseFloat(ethers.utils.formatEther(milestone.raisedAmount || 0))
              );
              return (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Remaining: <span className="font-semibold">{remainingMs.toFixed(4)} ETH</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <input type="number" step="0.001" min="0.001"
                      // FIX (Issue #3): Prevent browser from accepting over-cap values
                      max={remainingMs.toFixed(6)}
                      placeholder="0.1 ETH"
                      value={contribEth} onChange={(e) => setContribEth(e.target.value)}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm w-36 focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:text-white" />
                    <button disabled={contributing || !contribEth}
                      onClick={() => {
                        // FIX (Issue #3): Cap contribution amount to remaining allowance before sending.
                        // Original: directly passed contribEth without any cap check.
                        const parsed = parseFloat(contribEth || "0");
                        const finalEth = Math.min(parsed, remainingMs);
                        if (finalEth <= 0) return;
                        contribute({ args: [campaignId, milestone.id], value: ethers.utils.parseEther(finalEth.toFixed(18)) });
                      }}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition">
                      {contributing ? "Processing..." : "Fund Milestone"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Backer: vote */}
        {statusLabel === "Submitted" && !isCreator && hasContributed && !hasVoted && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              You contributed {fmt(myContrib)} ETH — cast your DAO vote:
            </p>
            <div className="flex gap-2">
              <button disabled={voting} onClick={() => vote({ args: [campaignId, milestone.id, true] })}
                className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition">
                <FiCheckCircle className="w-4 h-4" />{voting ? "Voting..." : "Approve"}
              </button>
              <button disabled={voting} onClick={() => vote({ args: [campaignId, milestone.id, false] })}
                className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition">
                <FiXCircle className="w-4 h-4" />{voting ? "Voting..." : "Reject"}
              </button>
            </div>
          </div>
        )}

        {/* Backer: already voted */}
        {statusLabel === "Submitted" && !isCreator && hasContributed && hasVoted && (
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <FiCheckCircle className="w-4 h-4 text-green-500" />
            You voted to {myVoteData?.inFavour ? "approve" : "reject"} this milestone.
          </p>
        )}

        {/* Backer: claim refund */}
        {statusLabel === "Rejected" && !isCreator && hasContributed && (
          <button disabled={refunding} onClick={() => claimRefund({ args: [campaignId, milestone.id] })}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition">
            {refunding ? "Processing..." : "Claim Refund"}
          </button>
        )}

        {/* Creator: submit evidence */}
        {isCreator && statusLabel === "Pending" && (
          <div>
            {!showEvidenceForm ? (
              <button onClick={() => setShowEvidenceForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition">
                Submit Completion Evidence
              </button>
            ) : (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">Submit Evidence for Oracle / DAO Review</p>

                {/* File upload */}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">Upload File to IPFS (optional)</label>
                  <div className="border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg p-3 text-center cursor-pointer hover:border-purple-500 transition"
                    onClick={() => fileInputRef.current?.click()}>
                    <FiUpload className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {evidenceFile ? evidenceFile.name : "Click to choose file"}
                    </span>
                    <input ref={fileInputRef} type="file" className="hidden"
                      onChange={(e) => setEvidenceFile(e.target.files[0] || null)} />
                  </div>
                </div>

                {/* Manual IPFS hash */}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">IPFS Hash (manual)</label>
                  <input type="text" placeholder="Qm..." value={ipfsHashManual}
                    onChange={(e) => setIpfsHashManual(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>

                {/* Evidence URL */}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">Evidence URL (GitHub, demo, report…)</label>
                  <input type="url" placeholder="https://..." value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>

                <div className="flex gap-2 pt-1">
                  <button disabled={submitting || uploadingEv} onClick={handleEvidenceSubmit}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition">
                    {uploadingEv ? "Uploading to IPFS..." : submitting ? "Submitting..." : "Submit to Blockchain"}
                  </button>
                  <button onClick={() => setShowEvidenceForm(false)}
                    className="px-4 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Creator: waiting for verdict */}
        {isCreator && statusLabel === "Submitted" && (
          <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <FiClock className="w-4 h-4" />
            Evidence submitted. Awaiting Oracle verification or DAO quorum.
          </p>
        )}

        {/* Creator: withdraw approved funds */}
        {isCreator && statusLabel === "Approved" && !milestone.fundsReleased && (
          <button disabled={withdrawing} onClick={() => withdraw({ args: [campaignId, milestone.id] })}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition">
            {withdrawing ? "Releasing..." : "Withdraw Milestone Funds"}
          </button>
        )}

        {/* Released state */}
        {statusLabel === "Released" && (
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <FiCheckCircle className="w-4 h-4 text-green-500" /> Funds have been released to the creator.
          </p>
        )}
      </div>
    </div>
  );
}

export default function MilestonePanel({ campaignId, creatorAddress }) {
  const { address, useCampaignMilestones } = useContract();
  const { data: milestones, isLoading } = useCampaignMilestones(campaignId);
  const isCreator = address?.toLowerCase() === creatorAddress?.toLowerCase();

  if (isLoading) {
    return (
      <div className="space-y-3 mt-6">
        {[1, 2].map((i) => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full mb-2" />
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!milestones || milestones.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 dark:text-gray-600">
        <p className="text-sm">No milestones have been set up for this campaign yet.</p>
      </div>
    );
  }

  return (
    <section className="mt-6">
      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-5 flex items-center gap-2">
        <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
        Project Milestones ({milestones.length})
      </h3>
      {milestones.map((m) => (
        <MilestoneCard key={m.id.toString()} milestone={m} campaignId={campaignId} isCreator={isCreator} />
      ))}
    </section>
  );
}
