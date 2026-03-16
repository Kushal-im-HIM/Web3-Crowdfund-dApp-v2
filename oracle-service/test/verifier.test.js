// test/verifier.test.js
// Run: npm test (inside oracle-service/)
// Uses Jest with axios mocked - no live network calls.

const axios = require("axios");
jest.mock("axios");

const { verifyEvidence, checkUrlReachable, checkIpfsCid, checkGitHubCommit } = require("../src/verifier");

const GATEWAY = "https://gateway.pinata.cloud/ipfs";

// ─── checkUrlReachable ───────────────────────────────────────────────────────

describe("checkUrlReachable", () => {
  it("returns passed=true for HTTP 200 HEAD", async () => {
    axios.head.mockResolvedValueOnce({ status: 200 });
    const r = await checkUrlReachable("https://example.com");
    expect(r.passed).toBe(true);
  });

  it("falls back to GET if HEAD fails", async () => {
    axios.head.mockResolvedValueOnce({ status: 405 });
    axios.get.mockResolvedValueOnce({ status: 200 });
    const r = await checkUrlReachable("https://example.com/file");
    expect(r.passed).toBe(true);
  });

  it("returns passed=false for 404", async () => {
    axios.head.mockResolvedValueOnce({ status: 404 });
    axios.get.mockResolvedValueOnce({ status: 404 });
    const r = await checkUrlReachable("https://example.com/missing");
    expect(r.passed).toBe(false);
  });

  it("returns passed=false on network error", async () => {
    axios.head.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const r = await checkUrlReachable("https://unreachable.local");
    expect(r.passed).toBe(false);
    expect(r.reason).toContain("unreachable");
  });

  it("returns passed=false for empty URL", async () => {
    const r = await checkUrlReachable("");
    expect(r.passed).toBe(false);
  });
});

// ─── checkGitHubCommit ───────────────────────────────────────────────────────

describe("checkGitHubCommit", () => {
  it("returns passed=true when commit exists", async () => {
    axios.get.mockResolvedValueOnce({ status: 200 });
    const r = await checkGitHubCommit({ github: { owner: "alice", repo: "dapp", sha: "abc123" } });
    expect(r.passed).toBe(true);
  });

  it("returns passed=false for 404 commit", async () => {
    axios.get.mockResolvedValueOnce({ status: 404 });
    const r = await checkGitHubCommit({ github: { owner: "alice", repo: "dapp", sha: "bad" } });
    expect(r.passed).toBe(false);
  });

  it("returns passed=true (no-op) when no github field", async () => {
    const r = await checkGitHubCommit({});
    expect(r.passed).toBe(true);
  });

  it("returns passed=false for missing sha", async () => {
    const r = await checkGitHubCommit({ github: { owner: "alice", repo: "dapp" } });
    expect(r.passed).toBe(false);
  });
});

// ─── verifyEvidence ──────────────────────────────────────────────────────────

describe("verifyEvidence", () => {
  it("approves when IPFS hash is reachable", async () => {
    // HEAD for IPFS => 200, GET for JSON => simple object (no github field)
    axios.head.mockResolvedValueOnce({ status: 200 });
    axios.get.mockResolvedValueOnce({ data: { description: "evidence" } });
    const { approved, results } = await verifyEvidence({ ipfsHash: "QmABC", url: "", ipfsGateway: GATEWAY });
    expect(approved).toBe(true);
    expect(results.some((r) => r.rule === "ipfs_reachable" && r.passed)).toBe(true);
  });

  it("approves via plain URL when no IPFS hash", async () => {
    axios.head.mockResolvedValueOnce({ status: 200 });
    const { approved } = await verifyEvidence({ ipfsHash: "", url: "https://example.com/evidence", ipfsGateway: GATEWAY });
    expect(approved).toBe(true);
  });

  it("rejects when both IPFS and URL fail", async () => {
    axios.head.mockRejectedValueOnce(new Error("fail")); // IPFS
    axios.head.mockRejectedValueOnce(new Error("fail")); // URL
    const { approved } = await verifyEvidence({ ipfsHash: "QmBAD", url: "https://dead.link", ipfsGateway: GATEWAY });
    expect(approved).toBe(false);
  });

  it("rejects when IPFS OK but GitHub commit missing", async () => {
    // IPFS OK
    axios.head.mockResolvedValueOnce({ status: 200 });
    // JSON evidence includes github requirement
    axios.get.mockResolvedValueOnce({
      data: { github: { owner: "alice", repo: "dapp", sha: "deadbeef" } },
    });
    // GitHub API 404
    axios.get.mockResolvedValueOnce({ status: 404 });

    const { approved } = await verifyEvidence({ ipfsHash: "QmXYZ", url: "", ipfsGateway: GATEWAY });
    expect(approved).toBe(false);
  });
});
