// src/verifier.js
// Pure verification rules - no blockchain or IPFS side effects.
// Each rule returns { passed: boolean, reason: string }.

const axios = require("axios");

/**
 * Verify that a plain URL responds with HTTP 200.
 * @param {string} url
 * @returns {Promise<{passed: boolean, reason: string}>}
 */
async function checkUrlReachable(url) {
  if (!url || url.trim() === "") {
    return { passed: false, reason: "No URL provided" };
  }
  try {
    const resp = await axios.head(url, { timeout: 10_000, validateStatus: () => true });
    if (resp.status === 200) {
      return { passed: true, reason: `URL responded ${resp.status}` };
    }
    // Some servers don't support HEAD; try GET
    const getResp = await axios.get(url, { timeout: 10_000, validateStatus: () => true });
    if (getResp.status >= 200 && getResp.status < 400) {
      return { passed: true, reason: `URL responded ${getResp.status} via GET` };
    }
    return { passed: false, reason: `URL responded ${getResp.status}` };
  } catch (err) {
    return { passed: false, reason: `URL unreachable: ${err.message}` };
  }
}

/**
 * Verify that an IPFS CID is retrievable from the configured gateway.
 * @param {string} cid  - IPFS CID (Qm… or bafk…)
 * @param {string} gateway - e.g. https://gateway.pinata.cloud/ipfs
 * @returns {Promise<{passed: boolean, reason: string}>}
 */
async function checkIpfsCid(cid, gateway) {
  if (!cid || cid.trim() === "") {
    return { passed: false, reason: "No IPFS CID provided" };
  }
  const url = `${gateway}/${cid}`;
  return checkUrlReachable(url);
}

/**
 * Verify that a GitHub commit SHA exists in a given repo.
 * evidenceJson may contain: { github: { owner, repo, sha } }
 * @param {object} evidenceJson - parsed evidence JSON from IPFS
 * @returns {Promise<{passed: boolean, reason: string}>}
 */
async function checkGitHubCommit(evidenceJson) {
  const gh = evidenceJson && evidenceJson.github;
  if (!gh) return { passed: true, reason: "No GitHub check required" };

  const { owner, repo, sha } = gh;
  if (!owner || !repo || !sha) {
    return { passed: false, reason: "Incomplete GitHub evidence fields" };
  }
  try {
    const resp = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`,
      {
        timeout: 10_000,
        headers: { Accept: "application/vnd.github.v3+json" },
        validateStatus: () => true,
      }
    );
    if (resp.status === 200) {
      return { passed: true, reason: `GitHub commit ${sha} exists in ${owner}/${repo}` };
    }
    return { passed: false, reason: `GitHub API returned ${resp.status} for commit ${sha}` };
  } catch (err) {
    return { passed: false, reason: `GitHub check failed: ${err.message}` };
  }
}

/**
 * Run all verification rules for a milestone submission.
 * Returns true if evidence is considered valid, false otherwise.
 * @param {{ ipfsHash: string, url: string, ipfsGateway: string }} evidence
 * @returns {Promise<{ approved: boolean, results: object[] }>}
 */
async function verifyEvidence({ ipfsHash, url, ipfsGateway }) {
  const results = [];
  let evidenceJson = null;

  // Rule 1: IPFS CID reachability
  if (ipfsHash) {
    const r = await checkIpfsCid(ipfsHash, ipfsGateway);
    results.push({ rule: "ipfs_reachable", ...r });

    if (r.passed) {
      // Try to parse evidence JSON for deeper checks
      try {
        const resp = await axios.get(`${ipfsGateway}/${ipfsHash}`, { timeout: 10_000 });
        evidenceJson = resp.data;
      } catch (_) {
        // Non-fatal; evidence JSON optional
      }
    }
  }

  // Rule 2: Plain URL reachability (fallback)
  if (url) {
    const r = await checkUrlReachable(url);
    results.push({ rule: "url_reachable", ...r });
  }

  // Rule 3: GitHub commit (optional; requires evidence JSON)
  if (evidenceJson) {
    const r = await checkGitHubCommit(evidenceJson);
    results.push({ rule: "github_commit", ...r });
  }

  // Must have at least one reachability check pass
  const anyPassed = results.some((r) => r.passed && (r.rule === "ipfs_reachable" || r.rule === "url_reachable"));
  const allCriticalPassed = results
    .filter((r) => r.rule !== "github_commit" || evidenceJson?.github) // only check gh if present
    .every((r) => r.passed);

  return { approved: anyPassed && allCriticalPassed, results };
}

module.exports = { verifyEvidence, checkUrlReachable, checkIpfsCid, checkGitHubCommit };
