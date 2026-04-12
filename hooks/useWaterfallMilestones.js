/**
 * hooks/useWaterfallMilestones.js
 *
 * Issue 8 fix (corrected) — Milestone progress bars collapsing after withdrawal.
 *
 * ROOT CAUSE recap:
 *   After withdrawMilestoneFunds() the contract does:
 *     campaign.raisedAmount -= milestone.targetAmount
 *   So if 1.0 ETH was raised and MS1 (0.5 ETH) is withdrawn, raisedAmount → 0.5 ETH.
 *   The old waterfall used raisedAmount as the budget, so MS2's bar dropped to 0%.
 *
 * PREVIOUS (WRONG) FIX:
 *   We switched to using campaignTargetAmount as the budget. This broke the fill
 *   display: 0.2 ETH donated on a 1.0 ETH target showed BOTH bars at 100%
 *   because the hook was distributing the full 1.0 ETH target amount.
 *
 * CORRECT FIX — Effective Budget Reconstruction:
 *   effective_raised = campaign.raisedAmount
 *                    + Σ(targetAmount of all Released milestones)
 *
 *   Released milestones had their targetAmount deducted from raisedAmount at
 *   withdrawal time. Adding them back reconstructs what the true raised amount
 *   was at the peak. This gives the correct fill for all scenarios:
 *
 *   Scenario A — 0.2 ETH donated, no withdrawals:
 *     effective_raised = 0.2 + 0 = 0.2 ETH
 *     MS1 (0.5 ETH target) → waterfall gets 0.2 ETH = 40% ✓
 *     MS2 (0.5 ETH target) → waterfall gets 0.0 ETH =  0% ✓
 *
 *   Scenario B — 1.0 ETH donated, MS1 withdrawn:
 *     raisedAmount = 0.5 ETH (decremented after withdrawal)
 *     MS1 status = Released
 *     effective_raised = 0.5 + 0.5 = 1.0 ETH
 *     MS1 (Released) → pinned at 100% ✓
 *     MS2 (0.5 ETH target) → gets 0.5 ETH = 100% ✓
 *
 *   Scenario C — 1.0 ETH donated, both withdrawn:
 *     raisedAmount = 0.0 ETH
 *     effective_raised = 0.0 + 0.5 + 0.5 = 1.0 ETH
 *     MS1 (Released) → pinned at 100% ✓
 *     MS2 (Released) → pinned at 100% ✓
 *
 * PROP: callers pass campaignRaisedAmount (the live, possibly-decremented value).
 *   CampaignDetails.js is updated back to campaignRaisedAmount={campaign.raisedAmount}.
 */

import { useMemo } from "react";

const MS_RELEASED = 4;
const MS_REFUNDED = 5;

/**
 * @param {Array}  milestones              raw milestone objects from useCampaignMilestones()
 * @param {*}      campaignRaisedAmount    campaign.raisedAmount in wei (may be decremented)
 */
export function useWaterfallMilestones(milestones, campaignRaisedAmount) {
  const raisedKey = campaignRaisedAmount?.toString() ?? "0";

  return useMemo(() => {
    if (!milestones || milestones.length === 0) return [];

    // ── Step 1: reconstruct effective_raised ──────────────────────────────
    // Add back the targetAmount of any milestone that has already been
    // Released (funds withdrawn) — the contract deducted those from raisedAmount.
    let currentRaised;
    try { currentRaised = BigInt(raisedKey); }
    catch { currentRaised = 0n; }

    let releasedSum = 0n;
    for (const m of milestones) {
      const statusNum = Number(m.status ?? 0);
      if (statusNum === MS_RELEASED) {
        try { releasedSum += BigInt(m.targetAmount?.toString() ?? "0"); }
        catch { /* skip malformed */ }
      }
    }

    // effective_raised is what raisedAmount would be if no withdrawals had happened
    let remaining = currentRaised + releasedSum;

    // ── Step 2: distribute via waterfall ─────────────────────────────────
    return milestones.map((milestone) => {
      const statusNum = Number(milestone.status ?? 0);
      const isReleased = statusNum === MS_RELEASED;
      const isRefunded = statusNum === MS_REFUNDED;

      let target;
      try { target = BigInt(milestone.targetAmount?.toString() ?? "0"); }
      catch { target = 0n; }

      // Released milestones: always pin at 100%.
      // Consume their targetAmount from remaining so subsequent milestones
      // calculate correctly.
      if (isReleased) {
        const consumed = remaining >= target ? target : remaining;
        remaining -= consumed;
        return { ...milestone, waterfallRaised: target, waterfallPercent: 100 };
      }

      // Refunded milestones: always pin at 0%.
      // Do NOT consume from remaining (the funds went back to contributors).
      if (isRefunded) {
        return { ...milestone, waterfallRaised: 0n, waterfallPercent: 0 };
      }

      // Pending / Submitted / Approved: fill from the remaining budget.
      let waterfallRaised;
      if (remaining >= target) {
        waterfallRaised = target;
        remaining -= target;
      } else {
        waterfallRaised = remaining;
        remaining = 0n;
      }

      const waterfallPercent =
        target === 0n
          ? 0
          : Math.min(100, Math.round((Number(waterfallRaised) * 100) / Number(target)));

      return { ...milestone, waterfallRaised, waterfallPercent };
    });
  }, [milestones, raisedKey]);
}
