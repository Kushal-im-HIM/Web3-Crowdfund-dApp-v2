/**
 * hooks/useWaterfallMilestones.js
 *
 * Issue 8 — Milestone progress bar collapse after withdrawal.
 *
 * ROOT CAUSE:
 *   The old hook used `campaignRaisedAmount` (the live `raisedAmount` field
 *   from the contract) as the waterfall budget. After the creator calls
 *   `withdrawMilestoneFunds()` for Milestone 1, the contract does:
 *
 *     campaign.raisedAmount -= milestone1.targetAmount
 *
 *   So if the campaign raised 1.0 ETH and MS1 target was 0.5 ETH, after
 *   withdrawal raisedAmount drops to 0.5 ETH. The waterfall then sees only
 *   0.5 ETH total to distribute, so:
 *     MS1 (target 0.5 ETH) → gets 0.5 ETH = 100%  ✓ (still fine)
 *     MS2 (target 0.5 ETH) → gets 0.0 ETH = 0%    ✗ WRONG (it WAS 100%)
 *
 *   The user sees MS2's progress bar drop to 0% as soon as MS1 is withdrawn,
 *   even though MS2 was fully funded.
 *
 * FIX:
 *   Use `campaign.targetAmount` (the total goal, which never changes) as the
 *   waterfall budget, NOT `raisedAmount` (which decrements on withdrawal).
 *
 *   For milestones that are already Released or Refunded, their progress bar
 *   is pinned at 100% / 0% respectively based on their final status, not the
 *   live waterfall calculation. This ensures:
 *     - Released milestones always show 100% (funds were verified & withdrawn)
 *     - Refunded milestones always show 0% (funds went back to contributors)
 *     - Pending/Submitted/Approved milestones show the waterfall fill from
 *       the stable targetAmount budget
 *
 * PROP CHANGE:
 *   Callers must now pass `campaignTargetAmount` (campaign.targetAmount) as
 *   the second argument instead of `campaignRaisedAmount`.
 *   The prop name is kept generic (`campaignBudget`) to avoid confusion.
 *   Both MilestonePanel.js and CampaignDetails.js are updated accordingly.
 */

import { useMemo } from "react";

// Milestone status integers matching the Solidity enum
const MS_RELEASED = 4;
const MS_REFUNDED = 5;

/**
 * @param {Array}  milestones      – raw milestone objects from useCampaignMilestones()
 * @param {*}      campaignBudget  – campaign.targetAmount in wei (stable total goal, never decrements)
 * @returns {Array} milestones with extra fields:
 *   - waterfallRaised  {BigInt}  virtual raised amount (wei)
 *   - waterfallPercent {number}  0‒100 fill percentage
 */
export function useWaterfallMilestones(milestones, campaignBudget) {
  const budgetKey = campaignBudget?.toString() ?? "0";

  return useMemo(() => {
    if (!milestones || milestones.length === 0) return [];

    let remaining;
    try {
      remaining = BigInt(budgetKey);
    } catch {
      remaining = 0n;
    }

    return milestones.map((milestone) => {
      const statusNum = Number(milestone.status ?? 0);
      const isReleased = statusNum === MS_RELEASED;
      const isRefunded = statusNum === MS_REFUNDED;

      let target;
      try {
        target = BigInt(milestone.targetAmount?.toString() ?? "0");
      } catch {
        target = 0n;
      }

      // Issue 8 FIX:
      // Released milestones: always pin to 100% — funds were verified and withdrawn.
      // The waterfall budget is NOT consumed for released milestones because
      // the progress is now stable rather than derived from decremented raisedAmount.
      if (isReleased) {
        // Still consume from remaining so subsequent milestones calculate correctly
        remaining = remaining >= target ? remaining - target : 0n;
        return {
          ...milestone,
          waterfallRaised: target,
          waterfallPercent: 100,
        };
      }

      // Refunded milestones: pin to 0% — contributors got their money back.
      if (isRefunded) {
        // Don't consume remaining budget for refunded milestones
        return {
          ...milestone,
          waterfallRaised: 0n,
          waterfallPercent: 0,
        };
      }

      // All other statuses (Pending, Submitted, Approved):
      // Fill from the remaining stable budget (derived from targetAmount, not raisedAmount).
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
          : Math.min(
            100,
            Math.round((Number(waterfallRaised) * 100) / Number(target))
          );

      return {
        ...milestone,
        waterfallRaised,
        waterfallPercent,
      };
    });
  }, [milestones, budgetKey]);
}
