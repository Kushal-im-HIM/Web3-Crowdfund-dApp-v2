/**
 * utils/transparencyUtils.js
 *
 * Handles all data-fetching logic for the Creator Transparency Dashboard.
 *
 * SETUP:
 *   For Sepolia/Mainnet, add this line to your .env.local:
 *     NEXT_PUBLIC_ETHERSCAN_API_KEY=your_etherscan_api_key_here
 *   Get a free key at https://etherscan.io/myapikey
 *
 * LOCALHOST:
 *   When NEXT_PUBLIC_NETWORK=localhost, mock data is returned automatically.
 *   No setup needed.
 */

const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "localhost";
const IS_LOCALHOST = NETWORK === "localhost";

// Etherscan base URLs by network
const ETHERSCAN_BASES = {
  sepolia: "https://api-sepolia.etherscan.io/api",
  mainnet: "https://api.etherscan.io/api",
  localhost: null,
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
// Realistic Hardhat transaction history. The `from` field is replaced at
// runtime with the searched address so the UI looks real while testing.

const MOCK_TX_TEMPLATES = [
  {
    hash: "0x4a3fc9d2e1b7a08f5c2d1e3f6a9b0c4d7e2f8a1b3c5d7e9f0a2b4c6d8e0f2a4b6",
    to: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    value: "0.0001",
    methodLabel: "createCampaign",
    status: "success",
    blockNumber: "12450231",
    tsOffset: -86400 * 2,    // 2 days ago
  },
  {
    hash: "0x7b9e1f3a5c7d9e1b3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d",
    to: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    value: "0.500000",
    methodLabel: "contributeToCampaign",
    status: "success",
    blockNumber: "12450876",
    tsOffset: -86400 * 1,
  },
  {
    hash: "0x2c4e6a8c0e2a4c6e8a0c2e4a6c8e0a2c4e6a8c0e2a4c6e8a0c2e4a6c8e0a2c4e",
    to: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    value: "0.000000",
    methodLabel: "registerCampaign",
    status: "success",
    blockNumber: "12451102",
    tsOffset: -3600 * 18,
  },
  {
    hash: "0x9f1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b",
    to: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    value: "0.250000",
    methodLabel: "contributeToMilestone",
    status: "success",
    blockNumber: "12451590",
    tsOffset: -3600 * 10,
  },
  {
    hash: "0x1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c",
    to: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    value: "2.000000",
    methodLabel: "withdrawCampaignFunds",
    status: "success",
    blockNumber: "12451880",
    tsOffset: -3600 * 4,
  },
  {
    hash: "0x6d8e0f2a4b6c8e0f2a4b6c8e0f2a4b6c8e0f2a4b6c8e0f2a4b6c8e0f2a4b6c8e",
    to: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    value: "0.000000",
    methodLabel: "submitMilestoneEvidence",
    status: "success",
    blockNumber: "12452100",
    tsOffset: -3600 * 1,
  },
  {
    hash: "0x3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d",
    to: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    value: "0.0001",
    methodLabel: "createCampaign",
    status: "failed",
    blockNumber: "12452210",
    tsOffset: -1800,
  },
];

/**
 * Build the mock transaction list for a given address.
 * @param {string} address
 * @returns {TransactionRecord[]}
 */
function buildMockTransactions(address) {
  const now = Math.floor(Date.now() / 1000);
  return MOCK_TX_TEMPLATES.map((t, i) => ({
    hash: t.hash,
    from: address,
    to: t.to,
    value: t.value,
    timestamp: new Date((now + t.tsOffset) * 1000).toISOString(),
    methodLabel: t.methodLabel,
    status: t.status,
    blockNumber: t.blockNumber,
  }));
}

// ─── Etherscan Fetcher ────────────────────────────────────────────────────────

/**
 * Maps a hex method ID to a human-readable label for common contract calls.
 * Falls back to the raw methodId if not recognised.
 * @param {string} methodId  - 10-char hex string e.g. "0x60806040"
 * @param {string} input     - Full tx input data
 * @returns {string}
 */
function resolveMethodLabel(methodId, input) {
  if (!methodId || methodId === "0x") return "ETH Transfer";
  const known = {
    "0x7d3d4c05": "createCampaign",
    "0x4e71d92d": "contributeToCampaign",
    "0x3ccfd60b": "withdrawCampaignFunds",
    "0x590e1ae3": "getRefund",
    "0xa2e62045": "registerCampaign",
    "0x1fb02b34": "createMilestone",
    "0x60e23e77": "contributeToMilestone",
    "0x6b64c769": "submitMilestoneEvidence",
    "0xf2fde38b": "transferOwnership",
    "0x8456cb59": "pause",
    "0x3f4ba83a": "unpause",
  };
  return known[methodId] ?? methodId;
}

/**
 * Fetch the wallet's transaction history.
 *
 * On localhost  → returns mock data immediately (no network call).
 * On Sepolia    → calls Etherscan API with the key from .env.local.
 *
 * @param {string} address  - Ethereum address to look up
 * @returns {Promise<{ data: TransactionRecord[], isMock: boolean }>}
 */
export async function fetchWalletTransactions(address) {
  if (!address) throw new Error("Address is required");

  // ── Localhost: return mock data ──────────────────────────────────────────
  if (IS_LOCALHOST) {
    // Simulate a short network delay so loading states are testable
    await new Promise((r) => setTimeout(r, 600));
    return { data: buildMockTransactions(address), isMock: true };
  }

  // ── Testnet / Mainnet: hit Etherscan ────────────────────────────────────
  const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  const baseUrl = ETHERSCAN_BASES[NETWORK] ?? ETHERSCAN_BASES.sepolia;

  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_ETHERSCAN_API_KEY is not set in .env.local. " +
      "Get a free key at https://etherscan.io/myapikey"
    );
  }

  const url =
    `${baseUrl}?module=account&action=txlist` +
    `&address=${address}` +
    `&startblock=0&endblock=99999999` +
    `&sort=desc&page=1&offset=25` +
    `&apikey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Etherscan HTTP error: ${res.status}`);

  const json = await res.json();

  // Etherscan returns status "0" for empty result sets too — handle gracefully
  if (json.status === "0" && json.message !== "No transactions found") {
    throw new Error(json.result || json.message || "Etherscan API error");
  }

  const raw = Array.isArray(json.result) ? json.result : [];

  const data = raw.map((tx) => ({
    hash: tx.hash,
    from: tx.from,
    to: tx.to || "Contract Creation",
    value: (Number(tx.value) / 1e18).toFixed(6),
    timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
    methodLabel: resolveMethodLabel(tx.methodId, tx.input),
    status: tx.isError === "0" ? "success" : "failed",
    blockNumber: tx.blockNumber,
  }));

  return { data, isMock: false };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Truncate a hex string (address or tx hash) for display.
 * @param {string} str
 * @param {number} [head=8]
 * @param {number} [tail=6]
 */
export function truncateHex(str, head = 8, tail = 6) {
  if (!str || str.length <= head + tail) return str;
  return `${str.slice(0, head)}...${str.slice(-tail)}`;
}

/**
 * Return the Etherscan (or block explorer) link for a tx hash.
 * Returns null on localhost.
 * @param {string} hash
 */
export function getTxExplorerUrl(hash) {
  if (IS_LOCALHOST) return null;
  const base =
    NETWORK === "mainnet"
      ? "https://etherscan.io/tx/"
      : "https://sepolia.etherscan.io/tx/";
  return `${base}${hash}`;
}

/**
 * Return the Etherscan address page URL.
 * Returns null on localhost.
 * @param {string} address
 */
export function getAddressExplorerUrl(address) {
  if (IS_LOCALHOST) return null;
  const base =
    NETWORK === "mainnet"
      ? "https://etherscan.io/address/"
      : "https://sepolia.etherscan.io/address/";
  return `${base}${address}`;
}
