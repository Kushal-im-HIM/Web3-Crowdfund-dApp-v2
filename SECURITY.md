# SECURITY.md — MilestoneManager

## Reentrancy

- All external ETH transfers (`withdrawMilestoneFunds`, `claimMilestoneRefund`) use the
  **pull-over-push** pattern: the caller initiates, balances are zeroed _before_ the
  transfer, and `ReentrancyGuard` is applied at the function level.
- No "push" loops exist — funds are never iterated and sent in a single transaction.

## Oracle Key Management

| Environment | Recommendation |
|-------------|---------------|
| Testnet     | Hot wallet (dedicated, low-balance EOA) |
| Mainnet     | Hardware wallet or cloud KMS (AWS KMS, GCP HSM) |
| Production  | Gnosis Safe 2-of-3 multisig as oracle, or decentralised oracle (Chainlink) |

**Rotating the oracle address**
```bash
# Using Hardhat + cast (Foundry)
cast send $MILESTONE_MANAGER "setOracleAddress(address)" $NEW_ORACLE \
  --rpc-url $RPC_URL --private-key $OWNER_KEY
```
Only the contract `owner` (deployer) can rotate the oracle. Do not share the owner key
with the oracle key — separation of duties prevents a compromised oracle from also
changing its own address.

## Overflow / Integer Safety

- Solidity 0.8.x has built-in overflow/underflow revert — no `SafeMath` needed.
- All ETH amounts are `uint256` (wei). ETH formatting only happens off-chain.
- OpenZeppelin `ReentrancyGuard` and `Ownable` are used from the audited `@openzeppelin/contracts ^4.9.3`.

## Access Control

| Role     | Can do |
|----------|--------|
| Owner    | setOracleAddress, setVotingParams |
| Oracle   | approveMilestoneByOracle, rejectMilestoneByOracle |
| Creator  | registerCampaign, createMilestone, submitMilestoneEvidence, withdrawMilestoneFunds |
| Backer   | contributeToMilestone, voteMilestone, claimMilestoneRefund |

## Storage Layout Compatibility

`MilestoneManager` is a _new, separate_ contract. It does **not** inherit from or share
storage with `CrowdfundingMarketplace`. Campaign IDs are referenced by value only.
Existing campaigns are unaffected.

## Suggested Gas Optimisations

1. **Pack structs** — `status (uint8)` + `fundsReleased (bool)` are already small; they
   share a 32-byte slot with the next `uint` field if reordered.
2. **`calldata` over `memory`** for string arguments in `createMilestone`, `submitMilestoneEvidence`.
3. **Vote accounting without loops** — `totalVotesFor/Against` are accumulators updated
   per vote; no loop at approval time (O(1) resolution).
4. **Mapping vs array for contributions** — `milestoneContributions` is a nested mapping
   (O(1) read/write), no dynamic array scans.
5. Run `npx hardhat test` with `--reporter gas` (hardhat-gas-reporter) to benchmark.

## Static Analysis

```bash
# In web3/
npm run slither          # requires slither-analyzer installed
npm run test:coverage    # solidity-coverage (branch coverage report)
```

## Incident Response

1. If oracle key is compromised: owner calls `setOracleAddress(newOracle)` immediately.
2. If a milestone is erroneously approved: DAO vote fallback cannot override after approval
   — mitigate by adding a `challengeWindow` in a future V2.
3. For stuck funds (oracle silent + voting window expired): call `finalizeVoting()` to
   force DAO resolution.

## Future Improvements

- Replace centralised oracle with **Chainlink Any API** or **zkTLS** for trustless verification.
- Add **Multisig oracle** (Gnosis Safe) for higher-value campaigns.
- Add a **challenge window** after oracle approval to allow DAO override.
- Consider **ERC-20 contribution support** for stablecoin-funded milestones.
- ZK proof of GitHub repo activity (e.g., via Reclaim Protocol).
