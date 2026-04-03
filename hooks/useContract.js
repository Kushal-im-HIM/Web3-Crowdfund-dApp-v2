/**
 * hooks/useContract.js
 *
 * NETWORK SYNC FIX:
 *   Previously imported CONTRACT_ADDRESS and MILESTONE_MANAGER_ADDRESS from
 *   constants/index.js — values baked in at boot time from NEXT_PUBLIC_NETWORK.
 *   Switching MetaMask chains at runtime didn't update these addresses, causing
 *   every contract read/write to target the wrong network silently.
 *
 *   Fix: useNetworkContracts() is called at the top of useContract() and returns
 *   live addresses keyed off wagmi's useNetwork() chain.id. Every hook inside
 *   useContract now closes over `contractAddress` and `milestoneAddress` from
 *   this live source instead of from the frozen import.
 *
 *   All other logic, function signatures, and return values are unchanged.
 */

import { useState, useEffect, useMemo } from "react";
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite, useContractReads } from "wagmi";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { STATUS_LABELS } from "../constants";
import { CROWDFUNDING_ABI, MILESTONE_MANAGER_ABI } from "../constants/abi";
import { useNetworkContracts } from "./useNetworkContracts";

export const useContract = () => {
  const { address, isConnected } = useAccount();

  // ── LIVE addresses from the currently connected chain ─────────────────────
  const {
    contractAddress: CONTRACT_ADDRESS,
    milestoneAddress: MILESTONE_MANAGER_ADDRESS,
  } = useNetworkContracts();

  // ─── LEGACY CROWDFUNDING HOOKS (RESTORED) ──────────────────────────────────

  const useCreateCampaign = (title, description, metadataHash, targetAmount, duration) => {
    const { config, error: prepareError } = usePrepareContractWrite({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "createCampaign",
      args: title ? [title, description, metadataHash, targetAmount, duration] : undefined,
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

  const useCampaign = (id) => useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getCampaign", args: [id], enabled: !!id && !!CONTRACT_ADDRESS, watch: true });

  const useActiveCampaigns = (offset = 0, limit = 10) => useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getActiveCampaigns", args: [offset, limit], enabled: !!CONTRACT_ADDRESS, watch: true });

  const useUserCampaigns = (usr) => useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getUserCampaigns", args: [usr], enabled: !!usr && !!CONTRACT_ADDRESS, watch: true });

  const useUserContributions = (usr) => useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getUserContributions", args: [usr], enabled: !!usr && !!CONTRACT_ADDRESS, watch: true });

  const useCampaignStats = (campaignId) => useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getCampaignStats", args: [campaignId], enabled: !!campaignId && !!CONTRACT_ADDRESS, watch: true });

  const useContribution = (campaignId, contributorAddress) => useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getContribution", args: [campaignId, contributorAddress], enabled: !!campaignId && !!contributorAddress && !!CONTRACT_ADDRESS, watch: true });

  const useContractStats = () => {
    const { data: rawStats, ...rest } = useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getContractStats", enabled: !!CONTRACT_ADDRESS, watch: true });
    return { data: rawStats ? { totalCampaigns: rawStats[0], totalFees: rawStats[1], contractBalance: rawStats[2] } : null, ...rest };
  };

  // ─── MULTIPLE CAMPAIGNS LOGIC (RESTORED) ────────────────────────────────────

  const useMultipleCampaigns = (campaignIds) => {
    const [campaigns, setCampaigns] = useState([]);
    const campaignContracts = useMemo(() => (campaignIds || []).map(id => ({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getCampaign", args: [id] })), [campaignIds, CONTRACT_ADDRESS]);
    const { data: campaignsData, isLoading, error } = useContractReads({ contracts: campaignContracts, enabled: campaignContracts.length > 0 && !!CONTRACT_ADDRESS, watch: true });

    useEffect(() => {
      if (campaignsData) {
        setCampaigns(campaignsData.map(r => r.status === "success" ? r.result : null).filter(Boolean));
      }
    }, [campaignsData]);
    return { campaigns, isLoading, error };
  };

  // ─── MILESTONE HOOKS ─────────────────────────────────────────────────────────

  const useCampaignMilestones = (campaignId) => useContractRead({ address: MILESTONE_MANAGER_ADDRESS, abi: MILESTONE_MANAGER_ABI, functionName: "getCampaignMilestones", args: [campaignId], enabled: !!campaignId && !!MILESTONE_MANAGER_ADDRESS, watch: true });

  const makeMilestoneWrite = (functionName, msg) => {
    const { write, writeAsync, isLoading, isSuccess, error, data } = useContractWrite({
      address: MILESTONE_MANAGER_ADDRESS, abi: MILESTONE_MANAGER_ABI, functionName,
      onSuccess: () => toast.success(msg),
      onError: (err) => toast.error(err?.message || "Action failed"),
    });
    return { write, writeAsync, isLoading, isSuccess, error, data };
  };

  const useRegisterCampaignForMilestones = () => makeMilestoneWrite("registerCampaign", "Milestone system active!");
  const useCreateMilestone = () => makeMilestoneWrite("createMilestone", "Milestone created!");
  const useContributeToMilestone = () => makeMilestoneWrite("contributeToMilestone", "Contribution successful!");
  const useVoteMilestone = () => makeMilestoneWrite("voteMilestone", "Vote recorded!");
  const useWithdrawMilestone = () => makeMilestoneWrite("withdrawMilestoneFunds", "Funds released!");
  const useClaimMilestoneRefund = () => makeMilestoneWrite("claimMilestoneRefund", "Refund claimed!");

  // DAO VOTING FIX: The waterfall model routes ALL contributions through the
  // main CrowdfundingMarketplace contract, so the MilestoneManager's per-milestone
  // ledger is always 0 for every backer. useMyMilestoneContribution must therefore
  // check the MAIN campaign's contribution record to determine voting eligibility.
  //
  // Before: MilestoneManager.getContribution(campaignId, milestoneId, address)
  //         → always 0 since no one calls contributeToMilestone() anymore
  // After:  CrowdfundingMarketplace.getContribution(campaignId, address)
  //         → returns the backer's real contribution routed through the main campaign
  //
  // milestoneId param is kept in the signature for API compatibility but is no
  // longer passed to the contract call.
  const useMyMilestoneContribution = (campaignId, _milestoneId) =>
    useContractRead({
      address: CONTRACT_ADDRESS,
      abi: CROWDFUNDING_ABI,
      functionName: "getContribution",
      args: [campaignId, address],
      enabled: Boolean(campaignId !== undefined && address && CONTRACT_ADDRESS),
      watch: true,
      cacheTime: 15000,
    });

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