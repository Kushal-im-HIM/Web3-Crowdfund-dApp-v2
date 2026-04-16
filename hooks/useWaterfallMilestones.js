/**
 * hooks/useWaterfallMilestones.js
 *
 * V6 CONTRACT FIX — raisedAmount is now IMMUTABLE.
 *
 * Previous behavior (v5 and earlier):
 *   `withdrawMilestoneFunds()` decremented `campaign.raisedAmount` by the
 *   milestone's targetAmount. So the hook needed to ADD BACK released
 *   milestone amounts to reconstruct "effective_raised":
 *     effective_raised = raisedAmount + Σ(released milestone targets)
 *
 * V6 behavior (current contract):
 *   `withdrawMilestoneFunds()` deducts from `campaignEscrow[_cId]` ONLY.
 *   `campaign.raisedAmount` is NEVER decremented — it equals the true
 *   historical raised total at all times.
 *
 * Therefore the reconstruction is NO LONGER NEEDED.
 * `effective_raised = campaign.raisedAmount` directly.
 *
 * The waterfall distribution logic (Released → pin 100%, Refunded → pin 0%,
 * others → fill from budget) is unchanged — only the starting budget value
 * is different.
 *
 * All scenarios with v6:
 *   A: 0.2 ETH raised, no withdrawals:
 *      remaining = 0.2 → MS1 (0.5) gets 0.2 (40%), MS2 gets 0 ✓
 *   B: 1.0 ETH raised, MS1 (0.5 ETH) withdrawn:
 *      remaining = 1.0 → MS1 Released pin 100% consume 0.5 → MS2 gets 0.5 (100%) ✓
 *   C: 1.0 ETH raised, both withdrawn:
 *      remaining = 1.0 → MS1 Released consume 0.5 → MS2 Released consume 0.5 ✓
 */

import { useMemo } from "react";

const MS_RELEASED = 4;
const MS_REFUNDED = 5;

/**
 * @param {Array}  milestones              raw milestone objects from useCampaignMilestones()
 * @param {*}      campaignRaisedAmount    campaign.raisedAmount in wei (IMMUTABLE in v6)
 */
export function useWaterfallMilestones(milestones, campaignRaisedAmount) {
  const raisedKey = campaignRaisedAmount?.toString() ?? "0";

  return useMemo(() => {
    if (!milestones || milestones.length === 0) return [];

    // V6 FIX: raisedAmount is immutable — use it directly as the budget.
    // No reconstruction needed (removed releasedSum addition from v5).
    let remaining;
    try { remaining = BigInt(raisedKey); }
    catch { remaining = 0n; }

    // ── Distribute via waterfall ──────────────────────────────────────────
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
