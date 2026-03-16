import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAccount, useContractRead } from "wagmi";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import {
  FiUser,
  FiClock,
  FiTarget,
  FiTrendingUp,
  FiShare2,
  FiHeart,
  FiUsers,
  FiCalendar,
} from "react-icons/fi";
import { useContract } from "../../hooks/useContract";
import { getFromIPFS } from "../../utils/ipfs";
import {
  formatEther,
  formatAddress,
  calculateTimeLeft,
  calculateProgress,
  formatDate,
  copyToClipboard,
} from "../../utils/helpers";
import { CONTRACT_ADDRESS } from "../../constants";
import { CROWDFUNDING_ABI } from "../../constants/abi";

// Milestone Integration
import MilestonePanel from "../Milestone/MilestonePanel";

export default function CampaignDetails({ campaignId }) {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const {
    useCampaign,
    useCampaignStats,
    useContributeToCampaignSimple,
    useWithdrawFunds,
    useGetRefund,
    useContribution,
    STATUS_LABELS
  } = useContract();

  const [metadata, setMetadata] = useState(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignId);
  const { data: stats } = useCampaignStats(campaignId);
  const { data: userContribution } = useContribution(campaignId, address);
  const { contribute, isLoading: contributing } = useContributeToCampaignSimple();
  const { withdrawFunds, isLoading: withdrawing } = useWithdrawFunds();
  const { getRefund, isLoading: refunding } = useGetRefund();

  const { data: contributions, isLoading: loadingContributions } =
    useContractRead({
      address: CONTRACT_ADDRESS,
      abi: CROWDFUNDING_ABI,
      functionName: "getCampaignContributions",
      args: [campaignId],
      enabled: Boolean(campaignId && CONTRACT_ADDRESS),
      watch: true,
    });

  useEffect(() => {
    const fetchMetadata = async () => {
      if (campaign?.metadataHash) {
        const result = await getFromIPFS(campaign.metadataHash);
        if (result.success) {
          setMetadata(result.data);
        }
      }
    };
    fetchMetadata();
  }, [campaign?.metadataHash]);

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4 text-white">Campaign Not Found</h2>
        <button onClick={() => router.push("/campaigns")} className="bg-blue-500 text-white px-6 py-2 rounded-lg">
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
  const isSuccessful = parseFloat(raisedAmount) >= parseFloat(targetAmount);
  const canWithdraw = isCreator && timeLeft.expired && isSuccessful && !campaign.withdrawn;
  const canGetRefund = !isCreator && timeLeft.expired && !isSuccessful && userContribution > 0;

  const processedContributions = contributions ? contributions.map((c) => ({
    contributor: c.contributor,
    amount: c.amount,
    timestamp: c.timestamp ? Number(c.timestamp.toString()) : null,
  })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) : [];

  const contributorSummary = processedContributions.reduce((acc, c) => {
    const addr = c.contributor;
    if (!acc[addr]) acc[addr] = { address: addr, totalAmount: 0n, count: 0 };
    acc[addr].totalAmount += BigInt(c.amount.toString());
    acc[addr].count += 1;
    return acc;
  }, {});

  const uniqueContributors = Object.values(contributorSummary).sort((a, b) => Number(b.totalAmount - a.totalAmount));

  const handleContribute = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) return toast.error("Invalid amount");
    await contribute?.({
      args: [campaignId],
      value: ethers.utils.parseEther(contributionAmount),
    });
    setContributionAmount("");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4">
      {/* ── Main Campaign Header ── */}
      <div className="bg-[#1a1f2e] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="relative h-64 md:h-96 bg-[#111827]">
          {metadata?.image ? (
            <img src={metadata.image} alt={campaign.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-700 opacity-20">{campaign.title}</div>
          )}
          <div className="absolute top-4 left-4">
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest ${campaign.active ? "bg-green-500/20 text-green-400 border border-green-500/50" : "bg-red-500/20 text-red-400 border border-red-500/50"}`}>
              {campaign.active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </div>

        <div className="p-8 flex flex-col lg:flex-row gap-10">
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl font-extrabold text-white tracking-tight">{campaign.title}</h1>
            <p className="text-gray-400 text-lg leading-relaxed">{campaign.description}</p>

            <div className="flex items-center gap-4 p-4 bg-[#111827] rounded-xl border border-gray-800">
              <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 border border-blue-500/30"><FiUser size={24} /></div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Project Creator</p>
                <p className="text-sm font-mono text-gray-300">{formatAddress(campaign.creator)} {isCreator && <span className="text-blue-400 ml-1">(You)</span>}</p>
              </div>
            </div>
          </div>

          <div className="lg:w-96 space-y-6 bg-[#111827] p-8 rounded-2xl border border-gray-800 shadow-inner">
            <div className="space-y-3">
              <div className="flex justify-between items-end"><span className="text-sm text-gray-400 font-bold">Funding Progress</span><span className="text-xl font-black text-white">{progress.toFixed(1)}%</span></div>
              <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden"><div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-1000" style={{ width: `${Math.min(progress, 100)}%` }} /></div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#1a1f2e] p-4 rounded-xl border border-gray-800"><p className="text-2xl font-black text-white">{raisedAmount}</p><p className="text-[10px] uppercase tracking-tighter text-gray-500 font-bold">ETH Raised</p></div>
              <div className="bg-[#1a1f2e] p-4 rounded-xl border border-gray-800"><p className="text-2xl font-black text-white">{targetAmount}</p><p className="text-[10px] uppercase tracking-tighter text-gray-500 font-bold">Target</p></div>
            </div>

            {!timeLeft.expired && campaign.active && !isCreator && isConnected && (
              <div className="space-y-4 pt-2">
                <div className="relative">
                  <input type="number" step="0.01" value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} className="w-full bg-[#1a1f2e] border border-gray-700 rounded-xl p-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="0.00 ETH" />
                  <span className="absolute right-4 top-4 text-gray-500 font-bold">ETH</span>
                </div>
                <button onClick={handleContribute} disabled={contributing} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]">
                  {contributing ? "Processing..." : "Support Project"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Milestone Section ── */}
      <div className="bg-[#1a1f2e] border border-gray-800 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
          <h3 className="text-2xl font-black text-white">Project Roadmap & Milestones</h3>
        </div>
        <MilestonePanel campaignId={campaignId} creatorAddress={campaign.creator} />
      </div>

      {/* ── Tabs Section ── */}
      <div className="bg-[#1a1f2e] border border-gray-800 rounded-2xl p-8 shadow-xl">
        <div className="flex space-x-10 border-b border-gray-800 mb-8">
          {["overview", "contributors"].map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} className={`pb-4 text-sm font-black uppercase tracking-widest transition-all ${activeTab === t ? "border-b-4 border-blue-500 text-blue-500" : "text-gray-500 hover:text-gray-300"}`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <h4 className="text-indigo-400 font-black uppercase text-xs tracking-[0.2em]">Campaign Stats</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-300"><FiCalendar className="text-gray-500" /> <span className="text-gray-500 w-20">Created:</span> {formatDate(campaign.createdAt)}</div>
                <div className="flex items-center gap-3 text-gray-300"><FiClock className="text-gray-500" /> <span className="text-gray-500 w-20">Deadline:</span> {formatDate(campaign.deadline)}</div>
              </div>
            </div>
            {metadata?.additionalInfo && (
              <div className="space-y-4">
                <h4 className="text-indigo-400 font-black uppercase text-xs tracking-[0.2em]">Additional Details</h4>
                <p className="text-gray-400 leading-relaxed italic border-l-4 border-gray-800 pl-6">{metadata.additionalInfo}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "contributors" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uniqueContributors.length > 0 ? uniqueContributors.map((c, i) => (
              <div key={c.address} className="flex justify-between items-center p-5 bg-[#111827] border border-gray-800 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-800 text-blue-400 rounded-full flex items-center justify-center font-black text-xs border border-gray-700">#{i + 1}</div>
                  <p className="text-sm font-mono text-gray-300">{formatAddress(c.address)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-white">{formatEther(c.totalAmount)} ETH</p>
                </div>
              </div>
            )) : <p className="text-gray-500 col-span-2 text-center py-10">No contributions yet. Be the first!</p>}
          </div>
        )}
      </div>
    </div>
  );
}