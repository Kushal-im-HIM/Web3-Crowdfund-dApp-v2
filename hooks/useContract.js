import { useState, useEffect, useMemo } from "react";
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite, useContractReads } from "wagmi";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { CONTRACT_ADDRESS, MILESTONE_MANAGER_ADDRESS, STATUS_LABELS } from "../constants";
import { CROWDFUNDING_ABI, MILESTONE_MANAGER_ABI } from "../constants/abi";

export const useContract = () => {
  const { address, isConnected } = useAccount();

  // ─── LEGACY CROWDFUNDING HOOKS (RESTORED) ──────────────────────────────────

  const useCreateCampaign = (title, description, metadataHash, targetAmount, duration) => {
    const { config, error: prepareError } = usePrepareContractWrite({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "createCampaign",
      args: title ? [title, description, metadataHash, targetAmount, duration] : undefined,
      // FIX (Issue #6): Was ethers.utils.parseEther("1") — 1 ETH hardcoded, which is 10,000x the
      // actual contract fee of 0.0001 ETH. This would drain 1 ETH from every campaign creator.
      // Corrected to the exact contract constant: 0.0001 ETH = 100000000000000 wei.
      // Original: value: title ? ethers.utils.parseEther("1") : undefined,
      value: title ? ethers.utils.parseEther("0.0001") : undefined,
      enabled: Boolean(address && CONTRACT_ADDRESS && title),
    });
    const { write, writeAsync, isLoading, isSuccess, error } = useContractWrite({
      ...config, onSuccess: () => toast.success("Campaign created!"),
      onError: (err) => toast.error(err?.message || "Transaction failed"),
    });
    return { createCampaign: write, createCampaignAsync: writeAsync, isLoading, isSuccess, error: error || prepareError, isPrepared: Boolean(config?.request) };
  };

  const useCreateCampaignSimple = () => {
    const { write, writeAsync, isLoading, isSuccess, error } = useContractWrite({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "createCampaign",
      onSuccess: () => toast.success("Campaign created successfully!"),
    });
    return { createCampaign: write, createCampaignAsync: writeAsync, isLoading, isSuccess, error };
  };

  const useContributeToCampaignSimple = () => {
    const { write, writeAsync, isLoading, isSuccess, error } = useContractWrite({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "contributeToCampaign",
      onSuccess: () => toast.success("Contribution made successfully!"),
    });
    return { contribute: write, contributeAsync: writeAsync, isLoading, isSuccess, error };
  };

  const useWithdrawFunds = () => {
    const { write, writeAsync, isLoading, isSuccess, error } = useContractWrite({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "withdrawCampaignFunds",
      onSuccess: () => toast.success("Funds withdrawn!"),
    });
    return { withdrawFunds: write, withdrawFundsAsync: writeAsync, isLoading, isSuccess, error };
  };

  const useGetRefund = () => {
    const { write, writeAsync, isLoading, isSuccess, error } = useContractWrite({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getRefund",
      onSuccess: () => toast.success("Refund processed!"),
    });
    return { getRefund: write, getRefundAsync: writeAsync, isLoading, isSuccess, error };
  };

  // ─── LEGACY READ FUNCTIONS (RESTORED) ───────────────────────────────────────

  const useCampaign = (id) => useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getCampaign", args: [id], enabled: !!id, watch: true });

  const useActiveCampaigns = (offset = 0, limit = 10) => useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getActiveCampaigns", args: [offset, limit], watch: true });

  const useUserCampaigns = (usr) => useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getUserCampaigns", args: [usr], enabled: !!usr, watch: true });

  const useUserContributions = (usr) => useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getUserContributions", args: [usr], enabled: !!usr, watch: true });

  const useCampaignStats = (campaignId) => useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getCampaignStats", args: [campaignId], enabled: !!campaignId, watch: true });

  const useContribution = (campaignId, contributorAddress) => useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getContribution", args: [campaignId, contributorAddress], enabled: !!campaignId && !!contributorAddress, watch: true });

  const useContractStats = () => {
    const { data: rawStats, ...rest } = useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getContractStats", watch: true });
    return { data: rawStats ? { totalCampaigns: rawStats[0], totalFees: rawStats[1], contractBalance: rawStats[2] } : null, ...rest };
  };

  // ─── MULTIPLE CAMPAIGNS LOGIC (RESTORED) ────────────────────────────────────

  const useMultipleCampaigns = (campaignIds) => {
    const [campaigns, setCampaigns] = useState([]);
    const campaignContracts = useMemo(() => (campaignIds || []).map(id => ({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getCampaign", args: [id] })), [campaignIds]);
    const { data: campaignsData, isLoading, error } = useContractReads({ contracts: campaignContracts, enabled: campaignContracts.length > 0, watch: true });

    useEffect(() => {
      if (campaignsData) {
        setCampaigns(campaignsData.map(r => r.status === "success" ? r.result : null).filter(Boolean));
      }
    }, [campaignsData]);
    return { campaigns, isLoading, error };
  };

  // ─── NEW MILESTONE HOOKS (INTEGRATED) ───────────────────────────────────────

  const useCampaignMilestones = (campaignId) => useContractRead({ address: MILESTONE_MANAGER_ADDRESS, abi: MILESTONE_MANAGER_ABI, functionName: "getCampaignMilestones", args: [campaignId], enabled: !!campaignId, watch: true });

  const makeMilestoneWrite = (functionName, msg) => {
    const { write, writeAsync, isLoading, isSuccess, error } = useContractWrite({
      address: MILESTONE_MANAGER_ADDRESS, abi: MILESTONE_MANAGER_ABI, functionName,
      onSuccess: () => toast.success(msg),
      onError: (err) => toast.error(err?.message || "Action failed"),
    });
    return { write, writeAsync, isLoading, isSuccess, error };
  };

  const useRegisterCampaignForMilestones = () => makeMilestoneWrite("registerCampaign", "Milestone system active!");
  const useCreateMilestone = () => makeMilestoneWrite("createMilestone", "Milestone created!");
  const useContributeToMilestone = () => makeMilestoneWrite("contributeToMilestone", "Contribution successful!");
  const useVoteMilestone = () => makeMilestoneWrite("voteMilestone", "Vote recorded!");
  const useWithdrawMilestone = () => makeMilestoneWrite("withdrawMilestoneFunds", "Funds released!");
  const useClaimMilestoneRefund = () => makeMilestoneWrite("claimMilestoneRefund", "Refund claimed!");

  // Read: how much ETH has the connected wallet contributed to a specific milestone?
  const useMyMilestoneContribution = (campaignId, milestoneId) =>
    useContractRead({
      address: MILESTONE_MANAGER_ADDRESS,
      abi: MILESTONE_MANAGER_ABI,
      functionName: "getContribution",
      args: [campaignId, milestoneId, address],
      enabled: Boolean(campaignId !== undefined && milestoneId !== undefined && address && MILESTONE_MANAGER_ADDRESS),
      watch: true,
      cacheTime: 15000,
    });

  // Read: has the connected wallet voted + their vote details?
  const useMyMilestoneVote = (campaignId, milestoneId) =>
    useContractRead({
      address: MILESTONE_MANAGER_ADDRESS,
      abi: MILESTONE_MANAGER_ABI,
      functionName: "getVote",
      args: [campaignId, milestoneId, address],
      enabled: Boolean(campaignId !== undefined && milestoneId !== undefined && address && MILESTONE_MANAGER_ADDRESS),
      watch: true,
      cacheTime: 15000,
    });

  // Write: submit evidence (upload IPFS hash + URL)
  const useSubmitEvidence = () => {
    const { write, writeAsync, isLoading, isSuccess, error } = useContractWrite({
      address: MILESTONE_MANAGER_ADDRESS,
      abi: MILESTONE_MANAGER_ABI,
      functionName: "submitMilestoneEvidence",
      onSuccess: () => toast.success("Evidence submitted! Oracle will verify shortly."),
      onError: (err) => toast.error(err?.message || "Evidence submission failed"),
    });
    return { write, writeAsync, isLoading, isSuccess, error };
  };

  // Read: check if a campaign is registered in MilestoneManager
  const useIsCampaignRegistered = (campaignId) =>
    useContractRead({
      address: MILESTONE_MANAGER_ADDRESS,
      abi: MILESTONE_MANAGER_ABI,
      functionName: "isCampaignRegistered",
      args: [campaignId],
      enabled: Boolean(campaignId !== undefined && MILESTONE_MANAGER_ADDRESS),
      watch: true,
      cacheTime: 15000,
    });

  return {
    address, isConnected, STATUS_LABELS,
    // Original Crowdfunding
    useCreateCampaign, useCreateCampaignSimple, useContributeToCampaignSimple, useWithdrawFunds, useGetRefund,
    useCampaign, useActiveCampaigns, useUserCampaigns, useUserContributions, useContractStats, useMultipleCampaigns,
    useCampaignStats, useContribution,
    // Milestones — reads
    useCampaignMilestones, useMyMilestoneContribution, useMyMilestoneVote, useIsCampaignRegistered,
    // Milestones — writes
    useRegisterCampaignForMilestones, useCreateMilestone, useContributeToMilestone,
    useSubmitEvidence, useVoteMilestone, useWithdrawMilestone, useClaimMilestoneRefund,
  };
};