# README_FEATURES.md — Milestone + Oracle + DAO Voting

## Overview

This feature layer adds **milestone-based crowdfunding** on top of the existing
`CrowdfundingMarketplace` contract without altering any of its storage or functions.

---

## How the Flows Work

### 1. Campaign Creator Opt-in

```
Creator calls registerCampaign(campaignId)
  → MilestoneManager records creator address for that campaign ID
Creator calls createMilestone(...) one or more times
  → Each milestone gets a unique ID, target ETH amount, and deadline
```

### 2. Backer Contribution to a Milestone

```
Backer calls contributeToMilestone(campaignId, milestoneId) with ETH
  → Funds held in MilestoneManager contract
  → Per-backer amount recorded (used for voting weight later)
```

### 3. Creator Submits Evidence

```
Creator calls submitMilestoneEvidence(campaignId, milestoneId, ipfsHash, url)
  → Milestone status → Submitted
  → MilestoneSubmitted event emitted
  → Oracle service picks up the event
```

### 4a. Oracle Approval Path (fast path)

```
Oracle service fetches evidence from IPFS / URL
  → Verifies: HTTP 200 reachable, optional GitHub commit check
  → If PASS: oracle calls approveMilestoneByOracle() → status = Approved
  → If FAIL: oracle calls rejectMilestoneByOracle() → status = Rejected
```

### 4b. DAO Voting Fallback (if oracle is silent or as override)

```
Backers call voteMilestone(campaignId, milestoneId, inFavour)
  → Vote weight = ETH contributed to that milestone
  → After each vote, contract checks quorum (30%) + threshold (51%)
  → If quorum met AND majority FOR → auto-Approved
  → If quorum met AND majority AGAINST → auto-Rejected
  → Anyone can call finalizeVoting() after votingWindowSeconds expires
```

### 5. Fund Release

```
If Approved:
  Creator calls withdrawMilestoneFunds() → ETH transferred to creator

If Rejected:
  Each backer calls claimMilestoneRefund() → their ETH returned
```

---

## Running Tests

### Smart Contracts (Hardhat)

```bash
cd web3
npm install
npm test                  # all tests
npm run test:coverage     # coverage report
npm run slither           # static analysis (requires slither)
```

### Oracle Service (Jest)

```bash
cd oracle-service
npm install
npm test
```

### Indexer (Jest)

```bash
cd indexer
npm install               # needs express, ethers, jest, supertest
npx jest indexer.test.js
```

### Frontend Components (Jest + React Testing Library)

```bash
# In the Next.js project root
npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
npm test -- --testPathPattern=Milestone
```

---

## Deployment Checklist

### Testnet (Sepolia)

- [ ] `cp web3/.env.example web3/.env` and fill `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `ORACLE_ADDRESS`
- [ ] `cd web3 && npm run deploy:milestone:sepolia`
- [ ] Note the deployed `MILESTONE_MANAGER_ADDRESS`
- [ ] Verify on Etherscan (auto-runs if `ETHERSCAN_API_KEY` set)
- [ ] `cp oracle-service/.env.example oracle-service/.env` and fill `RPC_URL`, `ORACLE_PRIVATE_KEY`, `MILESTONE_MANAGER_ADDRESS`
- [ ] `cd oracle-service && npm start`
- [ ] Add `NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS=<address>` to frontend `.env.local`

### Mainnet

- [ ] Audit `MilestoneManager.sol` with a professional firm before mainnet deploy
- [ ] Use hardware wallet / Gnosis Safe as deployer and oracle
- [ ] Set `START_BLOCK` in oracle `.env` to the deployment block to avoid replaying history
- [ ] Run indexer behind a process manager (PM2 / systemd)
- [ ] Pin all IPFS evidence via Pinata or web3.storage with your own API key

---

## Integration Guide (Frontend)

Add to your campaign detail page (`pages/campaign/[id].js`):

```jsx
import MilestonePanel from "../../components/Milestone/MilestonePanel";

// Inside your render, after the campaign details section:
<MilestonePanel
  campaignId={campaignId}          // number or BigNumber
  creatorAddress={campaign.creator} // string
/>
```

Add to your campaign creation page (`pages/create-campaign.js`), after the campaign is
successfully created and you have the `campaignId`:

```jsx
import MilestoneCreationForm from "../../components/Milestone/MilestoneCreationForm";

<MilestoneCreationForm
  campaignId={newCampaignId}   // returned from CampaignCreated event
  onDone={() => router.push(`/campaign/${newCampaignId}`)}
/>
```

Add `NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS` to your `.env.local`.

---

## Indexer API Reference

Start indexer: `node indexer/index.js` (default port 4000)

| Endpoint | Description |
|----------|-------------|
| `GET /campaigns` | All registered campaigns |
| `GET /campaigns/:id/milestones` | All milestones for a campaign |
| `GET /campaigns/:id/milestones/:mid` | Single milestone with votes + contributions |

---

## Risk & Limitations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Oracle centralization | Medium | Rotate to multisig or Chainlink in production |
| Creator submits false evidence | Medium | DAO voting fallback + oracle recheck |
| Voting plutocracy (whale influence) | Low-Medium | By design; acceptable trade-off vs Sybil resistance |
| Oracle service downtime | Low | DAO `finalizeVoting()` callable by anyone after window expires |
| Gas cost of many milestones | Low | Linear O(n) only in `getCampaignMilestones` view call; on-chain writes O(1) |
| IPFS link rot | Low | Pin evidence on Pinata; store URL fallback |

## Future Improvements

1. **Chainlink Any API / zkTLS** — trustless, decentralised oracle verification
2. **Multisig oracle** — Gnosis Safe 2-of-3 as oracle account
3. **Challenge window** — allow DAO to override an oracle approval within N days
4. **ERC-20 milestones** — accept USDC/DAI contributions for stable value
5. **ZK proof of delivery** — Reclaim Protocol or RISC Zero for verifiable computation proofs
6. **Quadratic voting** — reduce whale dominance in DAO voting
7. **The Graph subgraph** — replace lightweight indexer with a full Graph node for scale
