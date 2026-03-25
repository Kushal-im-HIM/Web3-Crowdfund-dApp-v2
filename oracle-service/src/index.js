// src/index.js
// Oracle service: listens for MilestoneSubmitted events, verifies evidence,
// then calls approveMilestoneByOracle or rejectMilestoneByOracle.

require("dotenv").config();
const { ethers } = require("ethers");
const { verifyEvidence } = require("./verifier");

// ─── ABI (minimal, only what the oracle needs) ──────────────────────────────
const MILESTONE_MANAGER_ABI = [
  "event MilestoneSubmitted(uint256 indexed campaignId, uint256 indexed milestoneId, string evidenceIpfsHash, string evidenceUrl)",
  "function approveMilestoneByOracle(uint256 campaignId, uint256 milestoneId) external",
  "function rejectMilestoneByOracle(uint256 campaignId, uint256 milestoneId) external",
  "function getMilestone(uint256 campaignId, uint256 milestoneId) external view returns (tuple(uint256 id, uint256 campaignId, string title, string description, uint256 targetAmount, uint256 raisedAmount, uint256 deadline, uint8 status, string evidenceIpfsHash, string evidenceUrl, uint256 totalVotesFor, uint256 totalVotesAgainst, uint256 contributorsCount, bool fundsReleased))",
];

// ─── Config ─────────────────────────────────────────────────────────────────
const {
  RPC_URL,
  ORACLE_PRIVATE_KEY,
  MILESTONE_MANAGER_ADDRESS,
  IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs",
  START_BLOCK = "0",
  POLL_INTERVAL_MS = "15000",
} = process.env;

if (!RPC_URL || !ORACLE_PRIVATE_KEY || !MILESTONE_MANAGER_ADDRESS) {
  console.error("Missing required env vars: RPC_URL, ORACLE_PRIVATE_KEY, MILESTONE_MANAGER_ADDRESS");
  process.exit(1);
}

// ─── Setup ───────────────────────────────────────────────────────────────────
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);
const contract = new ethers.Contract(MILESTONE_MANAGER_ADDRESS, MILESTONE_MANAGER_ABI, wallet);

// ─── In-memory processed set (restart-safe: just re-process; contracts are idempotent) ─
const processed = new Set();

// ─── Event handler ───────────────────────────────────────────────────────────
async function handleMilestoneSubmitted(campaignId, milestoneId, ipfsHash, url, event) {
  const key = `${campaignId}-${milestoneId}`;
  if (processed.has(key)) {
    console.log(`[oracle] Already processed milestone ${key}, skipping.`);
    return;
  }
  processed.add(key);

  console.log(`[oracle] MilestoneSubmitted: campaign=${campaignId} milestone=${milestoneId}`);
  console.log(`         IPFS hash: ${ipfsHash || "(none)"}`);
  console.log(`         URL:       ${url || "(none)"}`);

  try {
    const { approved, results } = await verifyEvidence({
      ipfsHash,
      url,
      ipfsGateway: IPFS_GATEWAY,
    });

    console.log("[oracle] Verification results:", JSON.stringify(results, null, 2));

    if (approved) {
      console.log(`[oracle] Approving milestone ${key}...`);
      const tx = await contract.approveMilestoneByOracle(campaignId, milestoneId, {
        gasLimit: 100_000,
      });
      await tx.wait();
      console.log(`[oracle] ✅ Approved tx: ${tx.hash}`);
    } else {
      console.log(`[oracle] Rejecting milestone ${key}...`);
      const tx = await contract.rejectMilestoneByOracle(campaignId, milestoneId, {
        gasLimit: 100_000,
      });
      await tx.wait();
      console.log(`[oracle] ❌ Rejected tx: ${tx.hash}`);
    }
  } catch (err) {
    console.error(`[oracle] Error processing milestone ${key}:`, err.message);
    // Remove from processed so it will be retried on next restart
    processed.delete(key);
  }
}

// ─── Historical catch-up ─────────────────────────────────────────────────────
async function catchUp() {
  let startBlock = parseInt(START_BLOCK, 10);
  const currentBlock = await provider.getBlockNumber();

  // Safety net: If START_BLOCK is 0 or missing, just start 5 blocks behind current
  if (!startBlock || startBlock === 0) {
    startBlock = currentBlock - 5;
  }

  console.log(`[oracle] Catching up from block ${startBlock} to ${currentBlock}...`);

  const filter = contract.filters.MilestoneSubmitted();
  const CHUNK_SIZE = 10; // Alchemy free tier limit is 10 blocks per request
  let allEvents = [];

  // Loop through the blocks in chunks of 10
  for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
    let toBlock = fromBlock + CHUNK_SIZE - 1;

    // Make sure we don't ask for blocks in the future
    if (toBlock > currentBlock) {
      toBlock = currentBlock;
    }

    console.log(`[oracle] Fetching events from block ${fromBlock} to ${toBlock}...`);

    try {
      const events = await contract.queryFilter(filter, fromBlock, toBlock);
      allEvents = allEvents.concat(events);
    } catch (error) {
      console.error(`[oracle] API Error fetching blocks ${fromBlock}-${toBlock}:`, error.message);
    }
  }

  console.log(`[oracle] Found ${allEvents.length} historical MilestoneSubmitted events.`);

  // Process any events it found
  for (const ev of allEvents) {
    const [campaignId, milestoneId, ipfsHash, url] = ev.args;
    await handleMilestoneSubmitted(campaignId, milestoneId, ipfsHash, url, ev);
  }
}

// ─── Live listener ────────────────────────────────────────────────────────────
function startListening() {
  console.log("[oracle] Listening for MilestoneSubmitted events...");
  contract.on("MilestoneSubmitted", handleMilestoneSubmitted);

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("[oracle] Shutting down...");
    contract.removeAllListeners();
    process.exit(0);
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("[oracle] Starting oracle service...");
  console.log("[oracle] Oracle wallet:", wallet.address);
  console.log("[oracle] Contract:", MILESTONE_MANAGER_ADDRESS);

  await catchUp();
  startListening();
}

main().catch((err) => {
  console.error("[oracle] Fatal error:", err);
  process.exit(1);
});

// ─── Dummy Web Server for Render Free Tier ───────────────────────────────────
const http = require('http');
const port = process.env.PORT || 10000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('Oracle is alive and listening to Sepolia!\n');
  res.end();
}).listen(port, () => {
  console.log(`[oracle] Dummy web server listening on port ${port} to satisfy Render.`);
});

// Export for testing
module.exports = { handleMilestoneSubmitted };
