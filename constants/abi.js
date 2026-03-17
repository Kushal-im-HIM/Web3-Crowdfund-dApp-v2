// constants/abi.js

export const CROWDFUNDING_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "creator", type: "address" }, { indexed: false, name: "targetAmount", type: "uint256" }, { indexed: false, name: "deadline", type: "uint256" }, { indexed: false, name: "metadataHash", type: "string" }], name: "CampaignCreated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: false, name: "totalRaised", type: "uint256" }], name: "CampaignFunded", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "creator", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "CampaignWithdrawn", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, name: "oldCommission", type: "uint256" }, { indexed: false, name: "newCommission", type: "uint256" }], name: "CommissionUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "contributor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "ContributionMade", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "admin", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "FeesWithdrawn", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "previousOwner", type: "address" }, { indexed: true, name: "newOwner", type: "address" }], name: "OwnershipTransferred", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, name: "account", type: "address" }], name: "Paused", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "campaignId", type: "uint256" }, { indexed: true, name: "contributor", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "RefundIssued", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, name: "account", type: "address" }], name: "Unpaused", type: "event" },
  { inputs: [], name: "CAMPAIGN_CREATION_FEE", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }], name: "campaignContributions", outputs: [{ name: "contributor", type: "address" }, { name: "amount", type: "uint256" }, { name: "timestamp", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "campaignCounter", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "uint256" }], name: "campaigns", outputs: [{ name: "id", type: "uint256" }, { name: "creator", type: "address" }, { name: "title", type: "string" }, { name: "description", type: "string" }, { name: "metadataHash", type: "string" }, { name: "targetAmount", type: "uint256" }, { name: "raisedAmount", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "withdrawn", type: "bool" }, { name: "active", type: "bool" }, { name: "createdAt", type: "uint256" }, { name: "contributorsCount", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "contributeToCampaign", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "", type: "uint256" }, { name: "", type: "address" }], name: "contributions", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_title", type: "string" }, { name: "_description", type: "string" }, { name: "_metadataHash", type: "string" }, { name: "_targetAmount", type: "uint256" }, { name: "_duration", type: "uint256" }], name: "createCampaign", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "deactivateCampaign", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }, { name: "_contributor", type: "address" }], name: "emergencyRefund", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "emergencyWithdraw", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_offset", type: "uint256" }, { name: "_limit", type: "uint256" }], name: "getActiveCampaigns", outputs: [{ components: [{ name: "id", type: "uint256" }, { name: "creator", type: "address" }, { name: "title", type: "string" }, { name: "description", type: "string" }, { name: "metadataHash", type: "string" }, { name: "targetAmount", type: "uint256" }, { name: "raisedAmount", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "withdrawn", type: "bool" }, { name: "active", type: "bool" }, { name: "createdAt", type: "uint256" }, { name: "contributorsCount", type: "uint256" }], name: "", type: "tuple[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "getCampaign", outputs: [{ components: [{ name: "id", type: "uint256" }, { name: "creator", type: "address" }, { name: "title", type: "string" }, { name: "description", type: "string" }, { name: "metadataHash", type: "string" }, { name: "targetAmount", type: "uint256" }, { name: "raisedAmount", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "withdrawn", type: "bool" }, { name: "active", type: "bool" }, { name: "createdAt", type: "uint256" }, { name: "contributorsCount", type: "uint256" }], name: "", type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "getCampaignContributions", outputs: [{ components: [{ name: "contributor", type: "address" }, { name: "amount", type: "uint256" }, { name: "timestamp", type: "uint256" }], name: "", type: "tuple[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "getCampaignStats", outputs: [{ name: "raisedAmount", type: "uint256" }, { name: "targetAmount", type: "uint256" }, { name: "contributorsCount", type: "uint256" }, { name: "timeLeft", type: "uint256" }, { name: "isActive", type: "bool" }, { name: "isSuccessful", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getContractStats", outputs: [{ name: "totalCampaigns", type: "uint256" }, { name: "totalFees", type: "uint256" }, { name: "contractBalance", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }, { name: "_contributor", type: "address" }], name: "getContribution", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "getRefund", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_user", type: "address" }], name: "getUserCampaigns", outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_user", type: "address" }], name: "getUserContributions", outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "isCampaignSuccessful", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "paused", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "reactivateCampaign", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "renounceOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "totalFeesCollected", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "newOwner", type: "address" }], name: "transferOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "user", type: "address" }, { name: "", type: "uint256" }], name: "userCampaigns", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "user", type: "address" }, { name: "", type: "uint256" }], name: "userContributions", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_campaignId", type: "uint256" }], name: "withdrawCampaignFunds", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_amount", type: "uint256" }], name: "withdrawFees", outputs: [], stateMutability: "nonpayable", type: "function" },
  { stateMutability: "payable", type: "receive" }
];

export const MILESTONE_MANAGER_ABI = [
  { name: "registerCampaign", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_campaignId", type: "uint256" }], outputs: [] },
  { name: "createMilestone", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_campaignId", type: "uint256" }, { name: "_title", type: "string" }, { name: "_description", type: "string" }, { name: "_targetAmount", type: "uint256" }, { name: "_duration", type: "uint256" }], outputs: [] },
  { name: "contributeToMilestone", type: "function", stateMutability: "payable", inputs: [{ name: "_campaignId", type: "uint256" }, { name: "_milestoneId", type: "uint256" }], outputs: [] },
  { name: "submitMilestoneEvidence", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_campaignId", type: "uint256" }, { name: "_milestoneId", type: "uint256" }, { name: "_ipfsHash", type: "string" }, { name: "_url", type: "string" }], outputs: [] },
  { name: "voteMilestone", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_campaignId", type: "uint256" }, { name: "_milestoneId", type: "uint256" }, { name: "_inFavour", type: "bool" }], outputs: [] },
  { name: "withdrawMilestoneFunds", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_campaignId", type: "uint256" }, { name: "_milestoneId", type: "uint256" }], outputs: [] },
  { name: "claimMilestoneRefund", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_campaignId", type: "uint256" }, { name: "_milestoneId", type: "uint256" }], outputs: [] },
  {
    name: "getMilestone", type: "function", stateMutability: "view",
    inputs: [{ name: "_campaignId", type: "uint256" }, { name: "_milestoneId", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple", components: [
        { name: "id", type: "uint256" }, { name: "campaignId", type: "uint256" }, { name: "title", type: "string" }, { name: "description", type: "string" }, { name: "targetAmount", type: "uint256" }, { name: "raisedAmount", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "status", type: "uint8" }, { name: "evidenceIpfsHash", type: "string" }, { name: "evidenceUrl", type: "string" }, { name: "totalVotesFor", type: "uint256" }, { name: "totalVotesAgainst", type: "uint256" }, { name: "contributorsCount", type: "uint256" }, { name: "fundsReleased", type: "bool" }
      ]
    }]
  },
  {
    name: "getCampaignMilestones", type: "function", stateMutability: "view",
    inputs: [{ name: "_campaignId", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple[]", components: [
        { name: "id", type: "uint256" }, { name: "campaignId", type: "uint256" }, { name: "title", type: "string" }, { name: "description", type: "string" }, { name: "targetAmount", type: "uint256" }, { name: "raisedAmount", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "status", type: "uint8" }, { name: "evidenceIpfsHash", type: "string" }, { name: "evidenceUrl", type: "string" }, { name: "totalVotesFor", type: "uint256" }, { name: "totalVotesAgainst", type: "uint256" }, { name: "contributorsCount", type: "uint256" }, { name: "fundsReleased", type: "bool" }
      ]
    }]
  },
  { name: "getContribution", type: "function", stateMutability: "view", inputs: [{ name: "_campaignId", type: "uint256" }, { name: "_milestoneId", type: "uint256" }, { name: "_contributor", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "getVote", type: "function", stateMutability: "view", inputs: [{ name: "_campaignId", type: "uint256" }, { name: "_milestoneId", type: "uint256" }, { name: "_voter", type: "address" }], outputs: [{ components: [{ name: "hasVoted", type: "bool" }, { name: "inFavour", type: "bool" }, { name: "weight", type: "uint256" }], name: "", type: "tuple" }] },
  { name: "isCampaignRegistered", type: "function", stateMutability: "view", inputs: [{ name: "_campaignId", type: "uint256" }], outputs: [{ name: "", type: "bool" }] }
];