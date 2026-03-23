// indexer/index.js
// Lightweight in-process indexer — no external DB required for development.
// Materializes Milestone events into an in-memory store and exposes a tiny
// Express REST API that the frontend polls.
//
// For production swap the in-memory store for SQLite/PostgreSQL.
//
// Run:
//   npm install ethers express dotenv
//   node indexer/index.js

require("dotenv").config();
const { ethers } = require("ethers");
const express = require("express");

// ─── ABI ────────────────────────────────────────────────────────────────────
const ABI = [
  "event CampaignRegistered(uint256 indexed campaignId, address indexed creator)",
  "event MilestoneCreated(uint256 indexed campaignId, uint256 indexed milestoneId, string title, uint256 targetAmount, uint256 deadline)",
  "event MilestoneFunded(uint256 indexed campaignId, uint256 indexed milestoneId, address indexed contributor, uint256 amount)",
  "event MilestoneSubmitted(uint256 indexed campaignId, uint256 indexed milestoneId, string evidenceIpfsHash, string evidenceUrl)",
  "event MilestoneApproved(uint256 indexed campaignId, uint256 indexed milestoneId, address approver)",
  "event MilestoneRejected(uint256 indexed campaignId, uint256 indexed milestoneId, address rejecter)",
  "event MilestoneReleased(uint256 indexed campaignId, uint256 indexed milestoneId, uint256 amount)",
  "event MilestoneVoted(uint256 indexed campaignId, uint256 indexed milestoneId, address indexed voter, bool inFavour, uint256 weight)",
  "function getCampaignMilestones(uint256 campaignId) external view returns (tuple(uint256 id, uint256 campaignId, string title, string description, uint256 targetAmount, uint256 raisedAmount, uint256 deadline, uint8 status, string evidenceIpfsHash, string evidenceUrl, uint256 totalVotesFor, uint256 totalVotesAgainst, uint256 contributorsCount, bool fundsReleased)[])",
];

const STATUS_NAMES = ["Pending", "Submitted", "Approved", "Rejected", "Released", "Refunded"];

// ─── In-memory store ─────────────────────────────────────────────────────────
// milestones[campaignId][milestoneId] = { ...fields, votes: [] }
const store = {
  milestones: {},    // campaignId -> milestoneId -> milestone object
  campaigns: {},    // campaignId -> { creator, milestoneIds: [] }
};

function ensureCampaign(campaignId) {
  const id = campaignId.toString();
  if (!store.campaigns[id]) store.campaigns[id] = { creator: null, milestoneIds: [] };
  return store.campaigns[id];
}

function ensureMilestone(campaignId, milestoneId) {
  const cid = campaignId.toString();
  const mid = milestoneId.toString();
  if (!store.milestones[cid]) store.milestones[cid] = {};
  if (!store.milestones[cid][mid]) {
    store.milestones[cid][mid] = {
      id: mid, campaignId: cid, title: "", description: "",
      targetAmount: "0", raisedAmount: "0", deadline: 0,
      status: "Pending", statusCode: 0,
      evidenceIpfsHash: "", evidenceUrl: "",
      totalVotesFor: "0", totalVotesAgainst: "0",
      contributorsCount: 0, fundsReleased: false,
      votes: [],
      contributions: [],
    };
    ensureCampaign(cid).milestoneIds.push(mid);
  }
  return store.milestones[cid][mid];
}

// ─── Event handlers ──────────────────────────────────────────────────────────
function onCampaignRegistered(campaignId, creator) {
  const c = ensureCampaign(campaignId.toString());
  c.creator = creator;
  console.log(`[idx] CampaignRegistered ${campaignId}`);
}

function onMilestoneCreated(campaignId, milestoneId, title, targetAmount, deadline) {
  const m = ensureMilestone(campaignId, milestoneId);
  m.title = title;
  m.targetAmount = targetAmount.toString();
  m.deadline = Number(deadline);
  console.log(`[idx] MilestoneCreated ${campaignId}-${milestoneId}: ${title}`);
}

function onMilestoneFunded(campaignId, milestoneId, contributor, amount) {
  const m = ensureMilestone(campaignId, milestoneId);
  m.raisedAmount = (BigInt(m.raisedAmount) + BigInt(amount.toString())).toString();
  m.contributions.push({ contributor, amount: amount.toString(), ts: Date.now() });
  console.log(`[idx] MilestoneFunded ${campaignId}-${milestoneId} +${ethers.utils.formatEther(amount)} ETH`);
}

function onMilestoneSubmitted(campaignId, milestoneId, ipfsHash, url) {
  const m = ensureMilestone(campaignId, milestoneId);
  m.status = "Submitted";
  m.statusCode = 1;
  m.evidenceIpfsHash = ipfsHash;
  m.evidenceUrl = url;
  console.log(`[idx] MilestoneSubmitted ${campaignId}-${milestoneId}`);
}

function onMilestoneApproved(campaignId, milestoneId, approver) {
  const m = ensureMilestone(campaignId, milestoneId);
  m.status = "Approved";
  m.statusCode = 2;
  m.approver = approver;
  console.log(`[idx] MilestoneApproved ${campaignId}-${milestoneId}`);
}

// FIX (Issue #8): The MilestoneRejected event has three arguments:
//   MilestoneRejected(uint256 campaignId, uint256 milestoneId, address rejecter)
// The original handler only declared two parameters (campaignId, milestoneId), which means
// the ethers event listener would pass `rejecter` as a third argument that was silently ignored.
// While this doesn't corrupt the status update here, it is semantically wrong and prevents
// storing the rejecter address for audit purposes.
// Original: function onMilestoneRejected(campaignId, milestoneId) {
function onMilestoneRejected(campaignId, milestoneId, rejecter) {
  const m = ensureMilestone(campaignId, milestoneId);
  m.status = "Rejected";
  m.statusCode = 3;
  m.rejecter = rejecter; // FIX: store rejecter address (was silently dropped)
  console.log(`[idx] MilestoneRejected ${campaignId}-${milestoneId} by ${rejecter}`);
}

function onMilestoneReleased(campaignId, milestoneId, amount) {
  const m = ensureMilestone(campaignId, milestoneId);
  m.status = "Released";
  m.statusCode = 4;
  m.amountPaid = amount.toString();
  console.log(`[idx] MilestoneReleased ${campaignId}-${milestoneId}`);
}

function onMilestoneVoted(campaignId, milestoneId, voter, inFavour, weight) {
  const m = ensureMilestone(campaignId, milestoneId);
  m.votes.push({ voter, inFavour, weight: weight.toString(), ts: Date.now() });
  if (inFavour) {
    m.totalVotesFor = (BigInt(m.totalVotesFor) + BigInt(weight.toString())).toString();
  } else {
    m.totalVotesAgainst = (BigInt(m.totalVotesAgainst) + BigInt(weight.toString())).toString();
  }
  console.log(`[idx] MilestoneVoted ${campaignId}-${milestoneId} by ${voter} (${inFavour ? "FOR" : "AGAINST"})`);
}

// ─── Subscribe ───────────────────────────────────────────────────────────────
async function startIndexer(contract) {
  console.log("[idx] Catching up historical events...");
  const startBlock = parseInt(process.env.START_BLOCK || "0", 10);
  const current = await contract.provider.getBlockNumber();

  const catchUp = async (eventName, handler) => {
    const events = await contract.queryFilter(contract.filters[eventName](), startBlock, current);
    for (const ev of events) handler(...ev.args, ev);
  };

  await catchUp("CampaignRegistered", onCampaignRegistered);
  await catchUp("MilestoneCreated", onMilestoneCreated);
  await catchUp("MilestoneFunded", onMilestoneFunded);
  await catchUp("MilestoneSubmitted", onMilestoneSubmitted);
  await catchUp("MilestoneApproved", onMilestoneApproved);
  await catchUp("MilestoneRejected", onMilestoneRejected);
  await catchUp("MilestoneReleased", onMilestoneReleased);
  await catchUp("MilestoneVoted", onMilestoneVoted);

  console.log("[idx] Catch-up done. Starting live listener...");

  contract.on("CampaignRegistered", onCampaignRegistered);
  contract.on("MilestoneCreated", onMilestoneCreated);
  contract.on("MilestoneFunded", onMilestoneFunded);
  contract.on("MilestoneSubmitted", onMilestoneSubmitted);
  contract.on("MilestoneApproved", onMilestoneApproved);
  contract.on("MilestoneRejected", onMilestoneRejected);
  contract.on("MilestoneReleased", onMilestoneReleased);
  contract.on("MilestoneVoted", onMilestoneVoted);
}

// ─── REST API ────────────────────────────────────────────────────────────────
function buildApi() {
  const app = express();
  app.use(express.json());

  // GET /campaigns/:id/milestones  — all milestones for a campaign
  app.get("/campaigns/:campaignId/milestones", (req, res) => {
    const { campaignId } = req.params;
    const ms = store.milestones[campaignId];
    if (!ms) return res.json([]);
    res.json(Object.values(ms));
  });

  // GET /campaigns/:id/milestones/:mid  — single milestone with votes
  app.get("/campaigns/:campaignId/milestones/:milestoneId", (req, res) => {
    const { campaignId, milestoneId } = req.params;
    const m = store.milestones?.[campaignId]?.[milestoneId];
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json(m);
  });

  // GET /campaigns  — list registered campaigns
  app.get("/campaigns", (_req, res) => {
    res.json(
      Object.entries(store.campaigns).map(([id, c]) => ({
        campaignId: id,
        creator: c.creator,
        milestoneCount: c.milestoneIds.length,
      }))
    );
  });

  return app;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const { RPC_URL, MILESTONE_MANAGER_ADDRESS, INDEXER_PORT = "4000" } = process.env;
  if (!RPC_URL || !MILESTONE_MANAGER_ADDRESS) {
    console.error("Set RPC_URL and MILESTONE_MANAGER_ADDRESS in .env");
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(MILESTONE_MANAGER_ADDRESS, ABI, provider);

  await startIndexer(contract);

  const app = buildApi();
  app.listen(parseInt(INDEXER_PORT, 10), () => {
    console.log(`[idx] API listening on http://localhost:${INDEXER_PORT}`);
    console.log(`[idx] Endpoints:
  GET /campaigns
  GET /campaigns/:id/milestones
  GET /campaigns/:id/milestones/:mid`);
  });
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

// Export for tests
module.exports = {
  store,
  onCampaignRegistered, onMilestoneCreated, onMilestoneFunded,
  onMilestoneSubmitted, onMilestoneApproved, onMilestoneRejected,
  onMilestoneReleased, onMilestoneVoted, buildApi,
};
