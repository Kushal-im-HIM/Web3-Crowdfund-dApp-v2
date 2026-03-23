import { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { FiPlus, FiTrash2, FiCheck } from "react-icons/fi";
import { useContract } from "../../hooks/useContract";

const EMPTY_MS = { title: "", description: "", targetEth: "", durationDays: "" };

// FIX (Issue #7): Added campaignTarget prop so that:
//   (a) registerCampaign() can pass it to the updated contract signature, and
//   (b) handleSaveAll() can validate that milestone totals don't exceed it.
export default function MilestoneCreationForm({ campaignId, campaignTarget, onDone }) {
  const { useRegisterCampaignForMilestones, useCreateMilestone } = useContract();
  const { write: register, isLoading: registering } = useRegisterCampaignForMilestones();
  const { write: createMs, isLoading: creatingMs } = useCreateMilestone();

  const [milestones, setMilestones] = useState([{ ...EMPTY_MS }]);
  const [step, setStep] = useState("register"); // "register" | "add" | "done"

  const handleAddMs = () => setMilestones([...milestones, { ...EMPTY_MS }]);
  const handleRemoveMs = (i) => setMilestones(milestones.filter((_, idx) => idx !== i));
  const handleUpdate = (i, field, value) => {
    const updated = [...milestones];
    updated[i][field] = value;
    setMilestones(updated);
  };

  const handleRegister = () => {
    if (!campaignId && campaignId !== 0) {
      return toast.error("No campaign ID — please try again");
    }
    // FIX (Issue #7): registerCampaign now requires a second argument: the campaign's
    // target amount in wei. Without it the contract call would revert.
    // Original: register({ args: [campaignId] });
    const targetWei = campaignTarget
      ? ethers.utils.parseEther(campaignTarget.toString())
      : undefined;
    if (!targetWei || targetWei.isZero()) {
      return toast.error("Campaign target is missing — cannot enable milestones");
    }
    register({
      args: [campaignId, targetWei],
    });
    // Optimistically move to add step — tx is async, contract will revert if it fails
    setTimeout(() => setStep("add"), 1000);
  };

  const handleSaveAll = () => {
    const valid = milestones.filter((m) => m.title.trim() && m.targetEth);
    if (valid.length === 0) {
      return toast.error("Add at least one milestone with a title and target amount");
    }

    // FIX (Issue #2/7): Validate that the cumulative milestone target does not exceed
    // the campaign goal before submitting any transactions. Without this check, the
    // contract revert would only surface after the first milestone that overflows,
    // leaving earlier ones committed and the UI in an inconsistent state.
    if (campaignTarget) {
      const totalEth = valid.reduce((sum, m) => sum + parseFloat(m.targetEth || "0"), 0);
      const targetEth = parseFloat(campaignTarget.toString());
      if (totalEth > targetEth) {
        return toast.error(
          `Milestone totals (${totalEth.toFixed(4)} ETH) exceed campaign target (${targetEth.toFixed(4)} ETH)`
        );
      }
    }

    valid.forEach((m) => {
      createMs({
        args: [
          campaignId,
          m.title.trim(),
          m.description.trim(),
          ethers.utils.parseEther(m.targetEth),
          BigInt(parseInt(m.durationDays || "30")) * 86400n,
        ],
      });
    });

    toast.success(`${valid.length} milestone${valid.length > 1 ? "s" : ""} submitted!`);
    setStep("done");
    if (onDone) setTimeout(onDone, 1500);
  };

  // ── Step 1: Register ───────────────────────────────────────────────────
  if (step === "register") {
    return (
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300 mb-1">
          Enable Milestone System
        </h3>
        <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-6">
          Milestones let you break your project into funded stages. Backers can contribute to individual milestones, vote on completion, and get refunds if a milestone is rejected.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleRegister}
            disabled={registering}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {registering ? "Registering..." : "Enable Milestones for this Campaign"}
          </button>
          {onDone && (
            <button
              onClick={onDone}
              className="px-5 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Step 3: Done ───────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
        <FiCheck className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-1">Milestones Submitted!</h3>
        <p className="text-sm text-green-700 dark:text-green-400">Your milestones are being recorded on-chain. They'll appear on the campaign page once confirmed.</p>
      </div>
    );
  }

  // ── Step 2: Add milestones ─────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Add Project Milestones</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Each milestone gets its own funding pool and approval vote.</p>
        </div>
        <button
          onClick={handleAddMs}
          className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          <FiPlus className="w-4 h-4" /> Add Milestone
        </button>
      </div>

      {milestones.map((m, i) => (
        <div key={i} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Milestone {i + 1}
            </span>
            {milestones.length > 1 && (
              <button onClick={() => handleRemoveMs(i)} className="text-red-400 hover:text-red-600 transition-colors">
                <FiTrash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <input
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Milestone title (e.g. 'Prototype Complete')"
            value={m.title}
            onChange={(e) => handleUpdate(i, "title", e.target.value)}
          />

          <textarea
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            placeholder="What will be completed and how will you prove it?"
            rows={2}
            value={m.description}
            onChange={(e) => handleUpdate(i, "description", e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Target Amount (ETH)</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="0.5"
                value={m.targetEth}
                onChange={(e) => handleUpdate(i, "targetEth", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Duration (days)</label>
              <input
                type="number"
                min="1"
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="30"
                value={m.durationDays}
                onChange={(e) => handleUpdate(i, "durationDays", e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSaveAll}
          disabled={creatingMs}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {creatingMs ? "Submitting..." : `Save ${milestones.filter(m => m.title).length || ""} Milestone${milestones.length !== 1 ? "s" : ""} to Blockchain`}
        </button>
        {onDone && (
          <button
            onClick={onDone}
            className="px-5 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            Done
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Each milestone is a separate on-chain transaction. MetaMask will prompt once per milestone.
      </p>
    </div>
  );
}
