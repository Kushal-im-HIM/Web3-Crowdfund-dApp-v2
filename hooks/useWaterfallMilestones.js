/**
 * hooks/useWaterfallMilestones.js
 *
 * ISSUE 1 FIX — Frontend Waterfall Model
 *
 * Problem:
 *   Contributors were calling `contributeToMilestone` directly on the
 *   MilestoneManager contract, which meant the *main* campaign's `raisedAmount`
 *   and contributors list never updated. The campaign page looked empty/unfunded
 *   even when milestones were fully covered.
 *
 * Solution (Frontend Waterfall, no Solidity changes required):
 *   - All user contributions are routed ONLY through `contributeToCampaign`
 *     on the main CrowdfundingMarketplace contract.
 *   - This hook computes a *virtual* fill amount for each milestone in order,
 *     using the campaign's canonical `raisedAmount` as the single source of truth.
 *   - Milestone 1 fills first, then 2, then 3, etc., in a waterfall cascade.
 *   - Individual `milestone.raisedAmount` from MilestoneManager is preserved as
 *     metadata but is NOT used for the progress display.
 *
 * Example:
 *   Campaign raisedAmount = 0.7 ETH
 *   Milestone 1 target    = 0.5 ETH → waterfallRaised = 0.5 ETH (100%)
 *   Milestone 2 target    = 0.5 ETH → waterfallRaised = 0.2 ETH  (40%)
 *   Milestone 3 target    = 0.5 ETH → waterfallRaised = 0.0 ETH   (0%)
 */

import { useMemo } from "react";

/**
 * @param {Array}  milestones          – raw milestone objects from useCampaignMilestones()
 * @param {*}      campaignRaisedAmount – campaign.raisedAmount in wei (BigInt, string, or BN)
 * @returns {Array} milestones with two extra fields:
 *   - waterfallRaised  {BigInt}  virtual raised amount (wei)
 *   - waterfallPercent {number}  0‒100 fill percentage
 */
export function useWaterfallMilestones(milestones, campaignRaisedAmount) {
  // Stringify the dep so the memo doesn't re-run on every render due to BigInt identity
  const raisedKey = campaignRaisedAmount?.toString() ?? "0";

  return useMemo(() => {
    if (!milestones || milestones.length === 0) return [];

    // Normalise total raised to BigInt safely
    let remaining;
    try {
      remaining = BigInt(raisedKey);
    } catch {
      remaining = 0n;
    }

    return milestones.map((milestone) => {
      // Normalise target for this milestone
      let target;
      try {
        target = BigInt(milestone.targetAmount?.toString() ?? "0");
      } catch {
        target = 0n;
      }

      // Assign as much of the remaining budget as possible to this milestone
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
  }, [milestones, raisedKey]);
}
