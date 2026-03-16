import { useState } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { uploadJSONToIPFS } from "../../utils/ipfs";
import { useContract } from "../../hooks/useContract";
import { STATUS_LABELS } from "../../constants";

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

const STATUS_COLOUR = {
  Pending:   "bg-yellow-100 text-yellow-800",
  Submitted: "bg-blue-100 text-blue-800",
  Approved:  "bg-green-100 text-green-800",
  Rejected:  "bg-red-100 text-red-800",
  Released:  "bg-gray-100 text-gray-600",
  Refunded:  "bg-gray-100 text-gray-600",
};

const fmt = (wei) => parseFloat(ethers.utils.formatEther(wei || 0)).toFixed(4);
const pct = (raised, target) => {
  if (!target || target === 0n) return 0;
  return Math.min(100, Math.round((Number(raised) * 100) / Number(target)));
};

function MilestoneCard({ milestone, campaignId, isCreator }) {
  const { address } = useAccount();
  const {
    useMyMilestoneContribution,
    useVoteMilestone,
    useContributeToMilestone,
    useSubmitEvidence,
    useWithdrawMilestone,
  } = useContract();

  const { data: myContrib } = useMyMilestoneContribution(campaignId, milestone.id);
  
  const { write: contribute, isLoading: contributing } = useContributeToMilestone();
  const { write: submitEv,   isLoading: submitting }   = useSubmitEvidence();
  const { write: vote,       isLoading: voting }        = useVoteMilestone();
  const { write: withdraw,   isLoading: withdrawing }  = useWithdrawMilestone();

  const [contribEth,   setContribEth]   = useState("");
  const [ipfsHash,     setIpfsHash]     = useState("");
  const [evidenceUrl,  setEvidenceUrl]  = useState("");
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState(null);

  const statusLabel = STATUS_LABELS[milestone.status] || "Unknown";
  const progress    = pct(milestone.raisedAmount, milestone.targetAmount);
  const deadlineDt  = new Date(Number(milestone.deadline) * 1000).toLocaleDateString();

  const handleEvidenceSubmit = async () => {
    setUploadingEvidence(true);
    let finalIpfsHash = ipfsHash;
    if (evidenceFile) {
      const reader = new FileReader();
      reader.readAsDataURL(evidenceFile);
      await new Promise((res) => { reader.onload = res; });
      const result = await uploadJSONToIPFS({
        fileName: evidenceFile.name,
        content: reader.result,
        description: `Evidence for milestone ${milestone.id}`,
      });
      if (result.success) finalIpfsHash = result.hash;
    }
    setUploadingEvidence(false);
    submitEv({ args: [campaignId, milestone.id, finalIpfsHash, evidenceUrl] });
  };

  return (
    <div className="border rounded-lg p-6 mb-4 bg-white shadow-md border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-bold text-lg text-gray-800">{milestone.title}</h4>
          <p className="text-sm text-gray-500">Deadline: {deadlineDt} · {milestone.contributorsCount?.toString()} Backers</p>
        </div>
        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${STATUS_COLOUR[statusLabel]}`}>
          {statusLabel}
        </span>
      </div>

      <p className="text-gray-600 text-sm mb-4">{milestone.description}</p>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-xs font-semibold text-gray-500">
          <span>{fmt(milestone.raisedAmount)} ETH Raised</span>
          <span>Target: {fmt(milestone.targetAmount)} ETH ({progress}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className="bg-indigo-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Action Area */}
      <div className="pt-4 border-t border-gray-50">
        {statusLabel === "Pending" && !isCreator && (
          <div className="flex items-center gap-3">
            <input 
              type="number" 
              placeholder="0.1 ETH" 
              value={contribEth} 
              onChange={(e) => setContribEth(e.target.value)}
              className="border border-gray-300 rounded-md p-2 text-sm w-32 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button 
              onClick={() => contribute({ args: [campaignId, milestone.id], value: ethers.utils.parseEther(contribEth || "0") })}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Fund Milestone
            </button>
          </div>
        )}

        {statusLabel === "Submitted" && !isCreator && myContrib > 0n && (
           <div className="flex gap-2">
             <button onClick={() => vote({ args: [campaignId, milestone.id, true] })} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700">Approve</button>
             <button onClick={() => vote({ args: [campaignId, milestone.id, false] })} className="bg-red-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-red-700">Reject</button>
           </div>
        )}

        {isCreator && statusLabel === "Pending" && (
          <button onClick={handleEvidenceSubmit} className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-purple-700 transition">
            {uploadingEvidence ? "Uploading..." : "Submit Evidence"}
          </button>
        )}
        
        {isCreator && statusLabel === "Approved" && !milestone.fundsReleased && (
          <button onClick={() => withdraw({ args: [campaignId, milestone.id] })} className="bg-green-700 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-green-800">
            Withdraw Funds
          </button>
        )}
      </div>
    </div>
  );
}

export default function MilestonePanel({ campaignId, creatorAddress }) {
  const { address, useCampaignMilestones } = useContract();
  const { data: milestones, isLoading } = useCampaignMilestones(campaignId);
  const isCreator = address?.toLowerCase() === creatorAddress?.toLowerCase();

  if (isLoading) return <div className="animate-pulse text-gray-400">Loading milestones...</div>;
  if (!milestones || milestones.length === 0) return null;

  return (
    <section className="mt-10">
      <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
        <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
        Project Milestones
      </h3>
      {milestones.map((m) => (
        <MilestoneCard key={m.id.toString()} milestone={m} campaignId={campaignId} isCreator={isCreator} />
      ))}
    </section>
  );
}