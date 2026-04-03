/**
 * constants/abi.js
 *
 * MANDATE 1 — Single ABI for the unified Crowdfunding.sol contract.
 *
 * What changed:
 *   • MILESTONE_MANAGER_ABI removed — all functions are now on the single contract.
 *   • registerCampaign now takes ONE arg (uint256 _cId). The old two-arg form
 *     (cId + campaignTarget) is gone because campaignTarget lives inside the
 *     campaigns mapping and no longer needs to be duplicated.
 *   • All milestone read/write functions moved into CROWDFUNDING_ABI.
 *   • setCrowdfundingMarketplace removed (no separate marketplace contract).
 */

export const CROWDFUNDING_ABI = [
  // ── Constructor ────────────────────────────────────────────────────────────
  { inputs: [{ name: "_oracle", type: "address" }], stateMutability: "nonpayable", type: "constructor" },

  // ── Events — Campaign ──────────────────────────────────────────────────────
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "creator", type: "address" }, { indexed: false, name: "targetAmount", type: "uint256" }, { indexed: false, name: "deadline", type: "uint256" }, { indexed: false, name: "metadataHash", type: "string" }], name: "CampaignCreated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: false, name: "totalRaised", type: "uint256" }], name: "CampaignFunded", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "creator", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "CampaignWithdrawn", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "contributor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "ContributionMade", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "admin", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "FeesWithdrawn", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "contributor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "RefundIssued", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, name: "oldCommission", type: "uint256" }, { indexed: false, name: "newCommission", type: "uint256" }], name: "CommissionUpdated", type: "event" },

  // ── Events — Milestone ─────────────────────────────────────────────────────
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "creator", type: "address" }], name: "MilestonesEnabled", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "milestoneId", type: "uint256" }, { indexed: false, name: "title", type: "string" }, { indexed: false, name: "targetAmount", type: "uint256" }, { indexed: false, name: "deadline", type: "uint256" }], name: "MilestoneCreated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "milestoneId", type: "uint256" }, { indexed: false, name: "evidenceIpfsHash", type: "string" }, { indexed: false, name: "evidenceUrl", type: "string" }], name: "MilestoneSubmitted", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "milestoneId", type: "uint256" }, { indexed: false, name: "approver", type: "address" }], name: "MilestoneApproved", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "milestoneId", type: "uint256" }, { indexed: false, name: "rejecter", type: "address" }], name: "MilestoneRejected", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "milestoneId", type: "uint256" }, { indexed: false, name: "amount", type: "uint256" }], name: "MilestoneReleased", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "milestoneId", type: "uint256" }, { indexed: true, name: "voter", type: "address" }, { indexed: false, name: "inFavour", type: "bool" }, { indexed: false, name: "weight", type: "uint256" }], name: "MilestoneVoted", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "oldOracle", type: "address" }, { indexed: true, name: "newOracle", type: "address" }], name: "OracleAddressUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, name: "account", type: "address" }], name: "Paused", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, name: "account", type: "address" }], name: "Unpaused", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "previousOwner", type: "address" }, { indexed: true, name: "newOwner", type: "address" }], name: "OwnershipTransferred", type: "event" },

  // ── Constants ──────────────────────────────────────────────────────────────
  { inputs: [], name: "CAMPAIGN_CREATION_FEE", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MAX_MILESTONES_PER_CAMPAIGN", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },

  // ── Campaign — Write ───────────────────────────────────────────────────────
  {
    inputs: [
      { name: "_title", type: "string" },
      { name: "_description", type: "string" },
      { name: "_metadataHash", type: "string" },
      { name: "_targetAmount", type: "uint256" },
      { name: "_duration", type: "uint256" }
    ],
    name: "createCampaign", outputs: [], stateMutability: "payable", type: "function"
  },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "contributeToCampaign", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "withdrawCampaignFunds", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "getRefund", outputs: [], stateMutability: "nonpayable", type: "function" },

  // ── Campaign — Read ────────────────────────────────────────────────────────
  {
    inputs: [{ name: "_campaignId", type: "uint256" }],
    name: "getCampaign",
    outputs: [{
      components: [
        { name: "id", type: "uint256" },
        { name: "creator", type: "address" },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "metadataHash", type: "string" },
        { name: "targetAmount", type: "uint256" },
        { name: "raisedAmount", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "withdrawn", type: "bool" },
        { name: "active", type: "bool" },
        { name: "createdAt", type: "uint256" },
        { name: "contributorsCount", type: "uint256" }
      ],
      name: "", type: "tuple"
    }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [{ name: "_offset", type: "uint256" }, { name: "_limit", type: "uint256" }],
    name: "getActiveCampaigns",
    outputs: [{
      components: [
        { name: "id", type: "uint256" },
        { name: "creator", type: "address" },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "metadataHash", type: "string" },
        { name: "targetAmount", type: "uint256" },
        { name: "raisedAmount", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "withdrawn", type: "bool" },
        { name: "active", type: "bool" },
        { name: "createdAt", type: "uint256" },
        { name: "contributorsCount", type: "uint256" }
      ],
      name: "", type: "tuple[]"
    }],
    stateMutability: "view", type: "function"
  },
  { inputs: [{ name: "_campaignId", type: "uint256" }, { name: "_contributor", type: "address" }], name: "getContribution", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "getCampaignContributions", outputs: [{ components: [{ name: "contributor", type: "address" }, { name: "amount", type: "uint256" }, { name: "timestamp", type: "uint256" }], name: "", type: "tuple[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_user", type: "address" }], name: "getUserCampaigns", outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_user", type: "address" }], name: "getUserContributions", outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "isCampaignSuccessful", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "getCampaignStats", outputs: [{ name: "raisedAmount", type: "uint256" }, { name: "targetAmount", type: "uint256" }, { name: "contributorsCount", type: "uint256" }, { name: "timeLeft", type: "uint256" }, { name: "isActive", type: "bool" }, { name: "isSuccessful", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getContractStats", outputs: [{ name: "totalCampaigns", type: "uint256" }, { name: "totalFees", type: "uint256" }, { name: "contractBalance", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "campaignCounter", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalFeesCollected", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "uint256" }, { name: "", type: "address" }], name: "contributions", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },

  // ── Milestone — Write ──────────────────────────────────────────────────────
  // MANDATE 1: registerCampaign now takes ONE arg (campaignTarget removed —
  // it's read directly from campaigns[_cId].targetAmount inside the contract).
  { inputs: [{ name: "_cId", type: "uint256" }], name: "registerCampaign", outputs: [], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [
      { name: "_cId", type: "uint256" },
      { name: "_title", type: "string" },
      { name: "_description", type: "string" },
      { name: "_targetAmount", type: "uint256" },
      { name: "_duration", type: "uint256" }
    ],
    name: "createMilestone", outputs: [], stateMutability: "nonpayable", type: "function"
  },
  {
    inputs: [
      { name: "_cId", type: "uint256" },
      { name: "_mId", type: "uint256" },
      { name: "_ipfsHash", type: "string" },
      { name: "_url", type: "string" }
    ],
    name: "submitMilestoneEvidence", outputs: [], stateMutability: "nonpayable", type: "function"
  },
  { inputs: [{ name: "_cId", type: "uint256" }, { name: "_mId", type: "uint256" }, { name: "_inFavour", type: "bool" }], name: "voteMilestone", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_cId", type: "uint256" }, { name: "_mId", type: "uint256" }], name: "withdrawMilestoneFunds", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_cId", type: "uint256" }, { name: "_mId", type: "uint256" }], name: "claimMilestoneRefund", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_cId", type: "uint256" }, { name: "_mId", type: "uint256" }], name: "finalizeVoting", outputs: [], stateMutability: "nonpayable", type: "function" },

  // ── Milestone — Read ───────────────────────────────────────────────────────
  { inputs: [{ name: "_cId", type: "uint256" }], name: "isCampaignRegistered", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ name: "_cId", type: "uint256" }, { name: "_mId", type: "uint256" }],
    name: "getMilestone",
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "id", type: "uint256" },
        { name: "campaignId", type: "uint256" },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "targetAmount", type: "uint256" },
        { name: "raisedAmount", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "status", type: "uint8" },
        { name: "evidenceIpfsHash", type: "string" },
        { name: "evidenceUrl", type: "string" },
        { name: "totalVotesFor", type: "uint256" },
        { name: "totalVotesAgainst", type: "uint256" },
        { name: "contributorsCount", type: "uint256" },
        { name: "fundsReleased", type: "bool" }
      ]
    }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [{ name: "_cId", type: "uint256" }],
    name: "getCampaignMilestones",
    outputs: [{
      name: "", type: "tuple[]",
      components: [
        { name: "id", type: "uint256" },
        { name: "campaignId", type: "uint256" },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "targetAmount", type: "uint256" },
        { name: "raisedAmount", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "status", type: "uint8" },
        { name: "evidenceIpfsHash", type: "string" },
        { name: "evidenceUrl", type: "string" },
        { name: "totalVotesFor", type: "uint256" },
        { name: "totalVotesAgainst", type: "uint256" },
        { name: "contributorsCount", type: "uint256" },
        { name: "fundsReleased", type: "bool" }
      ]
    }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [{ name: "_cId", type: "uint256" }, { name: "_mId", type: "uint256" }, { name: "_voter", type: "address" }],
    name: "getVote",
    outputs: [{ components: [{ name: "hasVoted", type: "bool" }, { name: "inFavour", type: "bool" }, { name: "weight", type: "uint256" }], name: "", type: "tuple" }],
    stateMutability: "view", type: "function"
  },
  { inputs: [{ name: "_cId", type: "uint256" }], name: "milestoneCount", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_cId", type: "uint256" }], name: "milestoneEnabled", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },

  // ── Admin ──────────────────────────────────────────────────────────────────
  { inputs: [], name: "oracleAddress", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_newOracle", type: "address" }], name: "setOracleAddress", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_quorumBps", type: "uint256" }, { name: "_thresholdBps", type: "uint256" }, { name: "_windowSeconds", type: "uint256" }], name: "setVotingParams", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "deactivateCampaign", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "reactivateCampaign", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_amount", type: "uint256" }], name: "withdrawFees", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_cId", type: "uint256" }, { name: "_contributor", type: "address" }], name: "emergencyRefund", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "emergencyWithdraw", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "paused", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "newOwner", type: "address" }], name: "transferOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "renounceOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },

  // ── Fallback ───────────────────────────────────────────────────────────────
  { stateMutability: "payable", type: "receive" }
];

/**
 * @deprecated MILESTONE_MANAGER_ABI is removed.
 * All milestone functions are now part of CROWDFUNDING_ABI above.
 * Update any import sites:
 *   import { MILESTONE_MANAGER_ABI } from "../constants/abi"  ← remove
 *   import { CROWDFUNDING_ABI }      from "../constants/abi"  ← use this
 */
export const MILESTONE_MANAGER_ABI = CROWDFUNDING_ABI; // safe shim during migration
