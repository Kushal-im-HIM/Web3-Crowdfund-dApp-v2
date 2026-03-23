import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAccount, useContractRead } from "wagmi";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import {
  FiUser, FiClock, FiTarget, FiShare2,
  FiHeart, FiUsers, FiCalendar, FiFlag,
  FiPlusCircle,
} from "react-icons/fi";
import { useContract } from "../../hooks/useContract";
import { getFromIPFS } from "../../utils/ipfs";
import {
  formatEther, formatAddress, calculateTimeLeft,
  calculateProgress, formatDate, copyToClipboard,
} from "../../utils/helpers";
import { CONTRACT_ADDRESS } from "../../constants";
import { CROWDFUNDING_ABI } from "../../constants/abi";
import MilestonePanel from "../Milestone/MilestonePanel";
import MilestoneCreationForm from "../Milestone/MilestoneCreationForm";

export default function CampaignDetails({ campaignId }) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const {
    useCampaign, useCampaignStats, useContributeToCampaignSimple,
    useWithdrawFunds, useGetRefund, useContribution, useIsCampaignRegistered,
  } = useContract();

  const [metadata, setMetadata] = useState(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showMilestoneSetup, setShowMilestoneSetup] = useState(false);

  const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignId);
  const { data: userContribution } = useContribution(campaignId, address);
  const { contribute, isLoading: contributing } = useContributeToCampaignSimple();
  const { withdrawFunds, isLoading: withdrawing } = useWithdrawFunds();
  const { getRefund, isLoading: refunding } = useGetRefund();

  // Check if this campaign has milestone system enabled
  const { data: isMilestoneRegistered, refetch: refetchRegistered } =
    useIsCampaignRegistered(campaignId);

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
  const isSuccessful = parseFloat(raisedAmount) >= parseFloat(targetAmount);
  const canWithdraw = isCreator && timeLeft.expired && isSuccessful && !campaign.withdrawn;
  const canGetRefund = !isCreator && timeLeft.expired && !isSuccessful && userContribution > 0;

  // Contributions processing
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

    // FIX (Issue #1): Guard against over-funding at the UI layer too.
    // Even though the contract now enforces a cap and refunds excess, we should warn
    // the user and auto-correct the value so they don't pay unnecessary gas for a tx
    // where most of their ETH would be immediately refunded.
    const remainingEth = parseFloat(targetAmount) - parseFloat(raisedAmount);
    if (remainingEth <= 0) {
      return toast.error("This campaign has already reached its funding target.");
    }
    let finalAmount = parseFloat(contributionAmount);
    if (finalAmount > remainingEth) {
      // Auto-cap and inform the user rather than silently over-sending.
      toast("Your amount was adjusted to the remaining allowance: " + remainingEth.toFixed(6) + " ETH", { icon: "ℹ️" });
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">

      {/* ── Campaign Hero Card ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-primary-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-primary-700">

        {/* Image */}
        <div className="relative h-64 md:h-80 bg-gradient-emerald">
          {metadata?.image
            ? <img src={metadata.image} alt={campaign.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-white text-8xl font-bold opacity-20">{campaign.title?.charAt(0) || "C"}</div>
          }
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="flex gap-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm ${campaign.active ? "bg-secondary-500/80 text-white" : "bg-red-500/80 text-white"}`}>
                {campaign.active ? "ACTIVE" : "INACTIVE"}
              </span>
              {isSuccessful && (
                <span className="px-3 py-1 text-xs font-bold bg-accent-500/80 text-white rounded-full backdrop-blur-sm">FUNDED</span>
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

              <div className="flex items-center gap-4 p-4 bg-primary-50 dark:bg-primary-700/60 rounded-lg border border-gray-200 dark:border-primary-600">
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
              <div className="bg-primary-50 dark:bg-primary-700/50 rounded-xl p-6 border border-gray-200 dark:border-primary-600 space-y-5">

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
                    <span className="font-bold text-gray-900 dark:text-white">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                    <div className="bg-gradient-emerald h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: parseFloat(raisedAmount).toFixed(3), label: "ETH Raised" },
                    { val: parseFloat(targetAmount).toFixed(3), label: "ETH Target" },
                    { val: uniqueContributors.length, label: "Backers" },
                    { val: timeLeft.expired ? "Ended" : timeLeft.text?.split(" ")[0] ?? "—", label: timeLeft.expired ? "" : "Days Left" },
                  ].map(({ val, label }, i) => (
                    <div key={i} className="bg-white dark:bg-primary-800 rounded-lg p-3 border border-gray-200 dark:border-primary-600 text-center">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{val}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Contribute input */}
                {!timeLeft.expired && campaign.active && !isCreator && isConnected && (
                  <div className="space-y-2">
                    {/* FIX (Issue #1): Show remaining allowance so users know the cap */}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Remaining:{" "}
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {Math.max(0, parseFloat(targetAmount) - parseFloat(raisedAmount)).toFixed(4)} ETH
                      </span>
                    </p>

                    {/* FIX (Issue #1): max attribute prevents browser from accepting more than allowed. */}
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={Math.max(0, parseFloat(targetAmount) - parseFloat(raisedAmount)).toFixed(6)}
                      placeholder="0.00 ETH"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-primary-600 rounded-lg text-sm bg-white dark:bg-primary-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-secondary-500 outline-none"
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
                  <div className="text-center p-3 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg">
                    <p className="text-accent-800 dark:text-accent-300 text-sm">Connect wallet to contribute</p>
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

      {/* ── Milestones Section ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-primary-800 rounded-xl shadow-lg border border-gray-200 dark:border-primary-700 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FiFlag className="w-5 h-5 text-tertiary-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Project Milestones</h2>
          </div>

          {/* Creator: show setup button if milestones not yet enabled */}
          {isCreator && !isMilestoneRegistered && !showMilestoneSetup && (
            <button
              onClick={() => setShowMilestoneSetup(true)}
              className="flex items-center gap-2 bg-tertiary-600 hover:bg-tertiary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <FiPlusCircle className="w-4 h-4" />
              Set Up Milestones
            </button>
          )}
        </div>

        {/* Creator setup form — inline on this page */}
        {isCreator && showMilestoneSetup && (
          <MilestoneCreationForm
            campaignId={campaignId}
            // FIX (Issue #7): campaignTarget was not passed, so MilestoneCreationForm
            // could not call the updated registerCampaign(id, target) nor validate
            // that milestone sums stay within the campaign goal.
            campaignTarget={targetAmount}
            onDone={() => {
              setShowMilestoneSetup(false);
              refetchRegistered?.();
            }}
          />
        )}

        {/* Milestone list (or empty state) */}
        {!showMilestoneSetup && (
          <MilestonePanel campaignId={campaignId} creatorAddress={campaign.creator} />
        )}

        {/* Non-creator empty hint */}
        {!isCreator && !isMilestoneRegistered && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            The creator has not set up milestones for this campaign yet.
          </p>
        )}
      </div>

      {/* ── Tabs Section ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-primary-800 rounded-xl shadow-lg border border-gray-200 dark:border-primary-700 p-6 md:p-8">
        <div className="border-b border-gray-200 dark:border-primary-700 mb-6">
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

        {/* Overview tab */}
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
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm border-l-4 border-gray-200 dark:border-gray-600 pl-4">
                  {metadata.additionalInfo}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Contributors tab */}
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
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-primary-900/50 border border-gray-100 dark:border-primary-700 rounded-lg hover:bg-gray-100 dark:hover:bg-primary-700/50 transition-colors">
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
                        {((Number(formatEther(c.totalAmount)) / Number(raisedAmount)) * 100).toFixed(1)}%
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
