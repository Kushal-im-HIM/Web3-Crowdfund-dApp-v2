// indexer/index.js
//
// FIX Issue 4 — Ghost Campaign Counter:
//   The contract has NO on-chain event for deactivation (deactivateCampaign()
//   sets campaigns[id].active = false but emits nothing). Therefore the only
//   way for the indexer to learn about deactivations is to POLL the contract.
//
//   Changes in this file:
//     1. store.campaigns[id].active is now tracked (defaults true on first seen).
//     2. A periodic sync task (every 60 s, configurable via SYNC_INTERVAL_MS)
//        queries getCampaign() for every known campaign ID and updates
//        store.campaigns[id].active accordingly.
//     3. GET /campaigns now returns ONLY entries where active !== false,
//        matching what getActiveCampaigns() returns on the frontend.
//     4. GET /campaigns/count returns the live count of non-deactivated campaigns
//        (useful for dashboards that talk to the indexer instead of the chain).
//     5. GET /campaigns/all returns every known campaign (including deactivated)
//        with an `active` boolean — useful for the admin panel.
//
// All existing milestone endpoints are unchanged.
//
// Run:
//   npm install ethers express dotenv
//   node indexer/index.js

require("dotenv").config();
const { ethers } = require("ethers");
const express = require("express");

// ─── ABI ────────────────────────────────────────────────────────────────────
const ABI = [
  // Campaign views — needed for active-status sync
  "function campaignCounter() external view returns (uint256)",
  "function getCampaign(uint256 id) external view returns (tuple(uint256 id, address creator, string title, string description, string metadataHash, uint256 targetAmount, uint256 raisedAmount, uint256 deadline, bool withdrawn, bool active, uint256 createdAt, uint256 contributorsCount))",

  // Campaign events
  "event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 targetAmount, uint256 deadline, string metadataHash)",

  // Milestone events
  "event MilestonesEnabled(uint256 indexed campaignId, address indexed creator)",
  "event MilestoneCreated(uint256 indexed campaignId, uint256 indexed milestoneId, string title, uint256 targetAmount, uint256 deadline)",
  "event MilestoneFunded(uint256 indexed campaignId, uint256 indexed milestoneId, address indexed contributor, uint256 amount)",
  "event MilestoneSubmitted(uint256 indexed campaignId, uint256 indexed milestoneId, string evidenceIpfsHash, string evidenceUrl)",
  "event MilestoneApproved(uint256 indexed campaignId, uint256 indexed milestoneId, address approver)",
  "event MilestoneRejected(uint256 indexed campaignId, uint256 indexed milestoneId, address rejecter)",
  "event MilestoneReleased(uint256 indexed campaignId, uint256 indexed milestoneId, uint256 amount)",
  "event MilestoneVoted(uint256 indexed campaignId, uint256 indexed milestoneId, address indexed voter, bool inFavour, uint256 weight)",
];

// ─── In-memory store ─────────────────────────────────────────────────────────
const store = {
  milestones: {},  // campaignId -> milestoneId -> milestone object
  campaigns: {},   // campaignId -> { creator, active, milestoneIds: [] }
};

function ensureCampaign(campaignId) {
  const id = campaignId.toString();
  if (!store.campaigns[id]) {
    store.campaigns[id] = { creator: null, active: true, milestoneIds: [] };
  }
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

function onCampaignCreated(campaignId, creator) {
  const c = ensureCampaign(campaignId.toString());
  c.creator = creator;
  c.active = true; // newly created campaigns are always active
  console.log(`[idx] CampaignCreated ${campaignId} by ${creator}`);
}

// Legacy: some deployments may still emit CampaignRegistered (MilestonesEnabled)
function onMilestonesEnabled(campaignId, creator) {
  const c = ensureCampaign(campaignId.toString());
  c.creator = creator;
  console.log(`[idx] MilestonesEnabled ${campaignId}`);
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

function onMilestoneRejected(campaignId, milestoneId, rejecter) {
  const m = ensureMilestone(campaignId, milestoneId);
  m.status = "Rejected";
  m.statusCode = 3;
  m.rejecter = rejecter;
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

// ─── FIX Issue 4: Active-status sync ─────────────────────────────────────────
//
// Because deactivateCampaign() in the contract emits NO event, the only
// reliable way to detect deactivations is to poll getCampaign() periodically.
//
// This function fetches the `active` field for every campaign ID the indexer
// knows about (union of: events seen + 1..campaignCounter) and updates the
// local store. It runs once at startup (after catch-up) and then on a timer.
//
async function syncActiveCampaignStatuses(contract) {
  try {
    let maxId = 0;
    try {
      maxId = Number(await contract.campaignCounter());
    } catch {
      // fallback: use highest id we've already seen in the store
      maxId = Math.max(0, ...Object.keys(store.campaigns).map(Number));
    }

    if (maxId === 0) return;

    let deactivated = 0;
    for (let id = 1; id <= maxId; id++) {
      try {
        const c = await contract.getCampaign(id);
        const sid = id.toString();
        if (!store.campaigns[sid]) {
          store.campaigns[sid] = { creator: c.creator, active: c.active, milestoneIds: [] };
        } else {
          if (store.campaigns[sid].active !== c.active) {
            console.log(`[idx] Campaign ${id} active changed: ${store.campaigns[sid].active} → ${c.active}`);
          }
          store.campaigns[sid].active = c.active;
          store.campaigns[sid].creator = c.creator;
        }
        if (!c.active) deactivated++;
      } catch (err) {
        // getCampaign reverts for non-existent IDs — expected for gaps
        console.warn(`[idx] Could not fetch campaign ${id}: ${err.message}`);
      }
    }
    console.log(`[idx] Active-status sync done. ${maxId} campaigns, ${deactivated} deactivated.`);
  } catch (err) {
    console.error("[idx] Active-status sync error:", err.message);
  }
}

// ─── Subscribe ───────────────────────────────────────────────────────────────
async function startIndexer(contract) {
  console.log("[idx] Catching up historical events...");
  let startBlock = parseInt(process.env.START_BLOCK || "0", 10);
  const current = await contract.provider.getBlockNumber();

  if (!startBlock || startBlock === 0) {
    startBlock = current - 5;
  }

  const catchUp = async (eventName, handler) => {
    console.log(`[idx] Catching up ${eventName}...`);
    const CHUNK_SIZE = 10;
    for (let fromBlock = startBlock; fromBlock <= current; fromBlock += CHUNK_SIZE) {
      let toBlock = fromBlock + CHUNK_SIZE - 1;
      if (toBlock > current) toBlock = current;
      try {
        const events = await contract.queryFilter(contract.filters[eventName](), fromBlock, toBlock);
        for (const ev of events) handler(...ev.args, ev);
      } catch (error) {
        console.error(`[idx] API Error fetching ${eventName} blocks ${fromBlock}-${toBlock}:`, error.message);
      }
    }
  };

  // Catch up campaign creation first so active flags are seeded
  await catchUp("CampaignCreated", onCampaignCreated);
  await catchUp("MilestonesEnabled", onMilestonesEnabled);
  await catchUp("MilestoneCreated", onMilestoneCreated);
  await catchUp("MilestoneFunded", onMilestoneFunded);
  await catchUp("MilestoneSubmitted", onMilestoneSubmitted);
  await catchUp("MilestoneApproved", onMilestoneApproved);
  await catchUp("MilestoneRejected", onMilestoneRejected);
  await catchUp("MilestoneReleased", onMilestoneReleased);
  await catchUp("MilestoneVoted", onMilestoneVoted);

  // FIX Issue 4: initial active-status sync after catch-up
  await syncActiveCampaignStatuses(contract);

  console.log("[idx] Catch-up done. Starting live listener...");

  contract.on("CampaignCreated", onCampaignCreated);
  contract.on("MilestonesEnabled", onMilestonesEnabled);
  contract.on("MilestoneCreated", onMilestoneCreated);
  contract.on("MilestoneFunded", onMilestoneFunded);
  contract.on("MilestoneSubmitted", onMilestoneSubmitted);
  contract.on("MilestoneApproved", onMilestoneApproved);
  contract.on("MilestoneRejected", onMilestoneRejected);
  contract.on("MilestoneReleased", onMilestoneReleased);
  contract.on("MilestoneVoted", onMilestoneVoted);

  // FIX Issue 4: periodic re-sync so deactivations are picked up quickly
  const syncIntervalMs = parseInt(process.env.SYNC_INTERVAL_MS || "60000", 10);
  setInterval(() => syncActiveCampaignStatuses(contract), syncIntervalMs);
  console.log(`[idx] Active-status sync scheduled every ${syncIntervalMs / 1000}s`);
}

// ─── REST API ────────────────────────────────────────────────────────────────
function buildApi() {
  const app = express();
  app.use(express.json());

  // FIX Issue 4: GET /campaigns  — returns ONLY non-deactivated campaigns
  // This matches what getActiveCampaigns() returns on the chain.
  // Admin-deactivated campaigns are excluded so counts stay consistent.
  app.get("/campaigns", (_req, res) => {
    const active = Object.entries(store.campaigns)
      .filter(([, c]) => c.active !== false)
      .map(([id, c]) => ({
        campaignId: id,
        creator: c.creator,
        active: c.active,
        milestoneCount: c.milestoneIds.length,
      }));
    res.json(active);
  });

  // FIX Issue 4: GET /campaigns/count  — count of non-deactivated campaigns
  // Use this for dashboards instead of relying on campaignCounter.
  app.get("/campaigns/count", (_req, res) => {
    const count = Object.values(store.campaigns).filter((c) => c.active !== false).length;
    res.json({ count });
  });

  // FIX Issue 4: GET /campaigns/all  — all campaigns including deactivated
  // Used by the admin panel to see the full picture.
  app.get("/campaigns/all", (_req, res) => {
    res.json(
      Object.entries(store.campaigns).map(([id, c]) => ({
        campaignId: id,
        creator: c.creator,
        active: c.active !== false, // false only if explicitly deactivated
        milestoneCount: c.milestoneIds.length,
      }))
    );
  });

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

  return app;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const { RPC_URL, MILESTONE_MANAGER_ADDRESS, PORT = "4000" } = process.env;
  if (!RPC_URL || !MILESTONE_MANAGER_ADDRESS) {
    console.error("Set RPC_URL and MILESTONE_MANAGER_ADDRESS in .env");
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(MILESTONE_MANAGER_ADDRESS, ABI, provider);

  await startIndexer(contract);

  const app = buildApi();
  app.listen(parseInt(PORT, 10), () => {
    console.log(`[idx] API listening on http://localhost:${PORT}`);
    console.log(`[idx] Endpoints:
  GET /campaigns             — non-deactivated campaigns (matches getActiveCampaigns)
  GET /campaigns/count       — count of non-deactivated campaigns
  GET /campaigns/all         — all campaigns including deactivated (admin use)
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
  onCampaignCreated, onMilestonesEnabled, onMilestoneCreated, onMilestoneFunded,
  onMilestoneSubmitted, onMilestoneApproved, onMilestoneRejected,
  onMilestoneReleased, onMilestoneVoted, buildApi, syncActiveCampaignStatuses,
};
