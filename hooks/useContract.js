/**
 * hooks/useContract.js
 *
 * MANDATE 1 — Single contract hook.
 *
 * What changed:
 *   • MILESTONE_MANAGER_ADDRESS removed. All hooks (including milestone reads
 *     and writes) target `contractAddress` from useNetworkContracts().
 *   • MILESTONE_MANAGER_ABI import kept as a shim alias (it now equals
 *     CROWDFUNDING_ABI) so no call sites break during migration.
 *   • registerCampaign now passes ONE arg [campaignId].
 *     The old two-arg form [campaignId, campaignTarget] is gone.
 *   • useMyMilestoneContribution still reads from the main contract's
 *     getContribution(campaignId, address) — waterfall model unchanged.
 *   • useMyMilestoneVote now reads getVote() from the single contract.
 *
 * MANDATE 2 — Voting UI:
 *   • useMyMilestoneVote correctly uses the SINGLE contract address, so the
 *     per-user `hasVoted` flag is always from the correct source.
 *   • No other hook-level changes needed — per-user tracking is enforced
 *     inside the Solidity contract (votes[cId][mId][voter]).
 */

import { useState, useEffect, useMemo } from "react";
import {
  useAccount,
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
  useContractReads,
} from "wagmi";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { STATUS_LABELS } from "../constants";
import { CROWDFUNDING_ABI } from "../constants/abi";
import { useNetworkContracts } from "./useNetworkContracts";

// Shim: MILESTONE_MANAGER_ABI is now identical to CROWDFUNDING_ABI
const MILESTONE_MANAGER_ABI = CROWDFUNDING_ABI;

export const useContract = () => {
  const { address, isConnected } = useAccount();

  // ── Live address from currently-connected chain ────────────────────────────
  const { contractAddress: CONTRACT_ADDRESS } = useNetworkContracts();

  // MANDATE 1: milestoneAddress === CONTRACT_ADDRESS (single contract)
  const MILESTONE_MANAGER_ADDRESS = CONTRACT_ADDRESS;

  // ─────────────────────────────────────────────────────────────────────────
  // Campaign — Write hooks
  // ─────────────────────────────────────────────────────────────────────────

  const useCreateCampaign = (title, description, metadataHash, targetAmount, duration) => {
    const { config, error: prepareError } = usePrepareContractWrite({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "createCampaign",
      args: title ? [title, description, metadataHash, targetAmount, duration] : undefined,
      value: title ? ethers.utils.parseEther("0.0001") : undefined,
      enabled: Boolean(address && CONTRACT_ADDRESS && title),
    });
    const { write, writeAsync, isLoading, isSuccess, error } = useContractWrite({
      ...config,
      onSuccess: () => toast.success("Campaign created!"),
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

  // ─────────────────────────────────────────────────────────────────────────
  // Campaign — Read hooks
  // ─────────────────────────────────────────────────────────────────────────

  const useCampaign = (id) =>
    useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getCampaign", args: [id], enabled: !!id && !!CONTRACT_ADDRESS, watch: true });

  const useActiveCampaigns = (offset = 0, limit = 10) =>
    useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getActiveCampaigns", args: [offset, limit], enabled: !!CONTRACT_ADDRESS, watch: true });

  const useUserCampaigns = (usr) =>
    useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getUserCampaigns", args: [usr], enabled: !!usr && !!CONTRACT_ADDRESS, watch: true });

  const useUserContributions = (usr) =>
    useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getUserContributions", args: [usr], enabled: !!usr && !!CONTRACT_ADDRESS, watch: true });

  const useCampaignStats = (campaignId) =>
    useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getCampaignStats", args: [campaignId], enabled: !!campaignId && !!CONTRACT_ADDRESS, watch: true });

  const useContribution = (campaignId, contributorAddress) =>
    useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getContribution", args: [campaignId, contributorAddress], enabled: !!campaignId && !!contributorAddress && !!CONTRACT_ADDRESS, watch: true });

  const useContractStats = () => {
    const { data: rawStats, ...rest } = useContractRead({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getContractStats", enabled: !!CONTRACT_ADDRESS, watch: true });
    return { data: rawStats ? { totalCampaigns: rawStats[0], totalFees: rawStats[1], contractBalance: rawStats[2] } : null, ...rest };
  };

  const useMultipleCampaigns = (campaignIds) => {
    const [campaigns, setCampaigns] = useState([]);
    const campaignContracts = useMemo(
      () => (campaignIds || []).map(id => ({ address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName: "getCampaign", args: [id] })),
      [campaignIds, CONTRACT_ADDRESS]
    );
    const { data: campaignsData, isLoading, error } = useContractReads({ contracts: campaignContracts, enabled: campaignContracts.length > 0 && !!CONTRACT_ADDRESS, watch: true });

    useEffect(() => {
      if (campaignsData) {
        setCampaigns(campaignsData.map(r => r.status === "success" ? r.result : null).filter(Boolean));
      }
    }, [campaignsData]);

    return { campaigns, isLoading, error };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Milestone — Read hooks  (all point to CONTRACT_ADDRESS — single contract)
  // ─────────────────────────────────────────────────────────────────────────

  const useCampaignMilestones = (campaignId) =>
    useContractRead({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI,
      functionName: "getCampaignMilestones",
      args: [campaignId], enabled: !!campaignId && !!CONTRACT_ADDRESS, watch: true,
    });

  /**
   * Reads contribution weight from the main campaign ledger (waterfall model).
   * milestoneId is accepted for API compatibility but ignored in the call.
   */
  const useMyMilestoneContribution = (campaignId, _milestoneId) =>
    useContractRead({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI,
      functionName: "getContribution",
      args: [campaignId, address],
      enabled: Boolean(campaignId !== undefined && address && CONTRACT_ADDRESS),
      watch: true, cacheTime: 15000,
    });

  /**
   * MANDATE 2 FIX — Per-user vote state.
   * Reads votes[cId][mId][address] from the unified contract.
   * Each wallet gets its own Vote struct — no global lockout possible.
   */
  const useMyMilestoneVote = (campaignId, milestoneId) =>
    useContractRead({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI,
      functionName: "getVote",
      args: [campaignId, milestoneId, address],
      enabled: Boolean(campaignId !== undefined && milestoneId !== undefined && address && CONTRACT_ADDRESS),
      watch: true, cacheTime: 15000,
    });

  const useIsCampaignRegistered = (campaignId) =>
    useContractRead({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI,
      functionName: "isCampaignRegistered",
      args: [campaignId],
      enabled: Boolean(campaignId !== undefined && CONTRACT_ADDRESS),
      watch: true, cacheTime: 15000,
    });

  // ─────────────────────────────────────────────────────────────────────────
  // Milestone — Write hooks  (all point to CONTRACT_ADDRESS — single contract)
  // ─────────────────────────────────────────────────────────────────────────

  const makeMilestoneWrite = (functionName, successMsg) => {
    const { write, writeAsync, isLoading, isSuccess, error, data } = useContractWrite({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI, functionName,
      onSuccess: () => toast.success(successMsg),
      onError: (err) => toast.error(err?.message || "Action failed"),
    });
    return { write, writeAsync, isLoading, isSuccess, error, data };
  };

  /**
   * MANDATE 1 FIX — registerCampaign now passes ONE arg.
   * Old call: write({ args: [campaignId, campaignTarget] })
   * New call: write({ args: [campaignId] })
   * campaignTarget is no longer required — read from on-chain campaigns mapping.
   */
  const useRegisterCampaignForMilestones = () =>
    makeMilestoneWrite("registerCampaign", "Milestone system active!");

  const useCreateMilestone = () => makeMilestoneWrite("createMilestone", "Milestone created!");
  const useContributeToMilestone = () => makeMilestoneWrite("contributeToMilestone", "Contribution successful!");
  const useVoteMilestone = () => makeMilestoneWrite("voteMilestone", "Vote recorded!");
  const useWithdrawMilestone = () => makeMilestoneWrite("withdrawMilestoneFunds", "Funds released!");
  const useClaimMilestoneRefund = () => makeMilestoneWrite("claimMilestoneRefund", "Refund claimed!");

  const useSubmitEvidence = () => {
    const { write, writeAsync, isLoading, isSuccess, error } = useContractWrite({
      address: CONTRACT_ADDRESS, abi: CROWDFUNDING_ABI,
      functionName: "submitMilestoneEvidence",
      onSuccess: () => toast.success("Evidence submitted! Oracle will verify shortly."),
      onError: (err) => toast.error(err?.message || "Evidence submission failed"),
    });
    return { write, writeAsync, isLoading, isSuccess, error };
  };

  return {
    address, isConnected, STATUS_LABELS,
    // Campaign writes
    useCreateCampaign, useCreateCampaignSimple, useContributeToCampaignSimple,
    useWithdrawFunds, useGetRefund,
    // Campaign reads
    useCampaign, useActiveCampaigns, useUserCampaigns, useUserContributions,
    useContractStats, useMultipleCampaigns, useCampaignStats, useContribution,
    // Milestone reads
    useCampaignMilestones, useMyMilestoneContribution, useMyMilestoneVote,
    useIsCampaignRegistered,
    // Milestone writes
    useRegisterCampaignForMilestones, useCreateMilestone, useContributeToMilestone,
    useSubmitEvidence, useVoteMilestone, useWithdrawMilestone, useClaimMilestoneRefund,
  };
};
