/**
 * MilestoneCreationForm.js
 *
 * Fixes applied:
 *  Issue 2 — Milestone count limits: min 2, max 5.
 *  Issue 3 — TX race condition: UI locked until registerCampaign is confirmed on-chain.
 *  Issue 4 — Fund sync: live budget bar + submit-time validation vs campaign target.
 *  Issue 5 — Restyled to subtle dark-mode palette (slate tones, no clashing indigo).
 */

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { useWaitForTransaction } from "wagmi";
import { FiPlus, FiTrash2, FiCheck, FiLoader, FiAlertTriangle, FiInfo } from "react-icons/fi";
import { useContract } from "../../hooks/useContract";

const MIN_MILESTONES = 2;
const MAX_MILESTONES = 5;
const EMPTY_MS = { title: "", description: "", targetEth: "", durationDays: "" };

function sumEth(milestones) {
  return milestones.reduce((s, m) => s + parseFloat(m.targetEth || "0"), 0);
}

export default function MilestoneCreationForm({ campaignId, campaignTarget, onDone }) {
  const { useRegisterCampaignForMilestones, useCreateMilestone } = useContract();

  const [step, setStep] = useState("register"); // register | confirming | add | done
  const [milestones, setMilestones] = useState(
    Array.from({ length: MIN_MILESTONES }, () => ({ ...EMPTY_MS }))
  );

  const {
    write: register,
    isLoading: registering,
    data: registerData,
  } = useRegisterCampaignForMilestones();

  const { write: createMs, isLoading: creatingMs } = useCreateMilestone();

  // Issue 3 FIX: wait for the registration tx to be mined before unlocking the form.
  const { isLoading: waitingForRegister } = useWaitForTransaction({
    hash: registerData?.hash,
    enabled: Boolean(registerData?.hash),
    onSuccess: () => {
      toast.success("Milestone system confirmed on-chain!");
      setStep("add");
    },
    onError: (err) => {
      toast.error("Registration failed: " + (err?.message ?? "unknown"));
      setStep("register");
    },
  });

  // List helpers
  const handleAddMs = () => {
    if (milestones.length >= MAX_MILESTONES) {
      return toast.error("Maximum " + MAX_MILESTONES + " milestones allowed.");
    }
    setMilestones([...milestones, { ...EMPTY_MS }]);
  };

  const handleRemoveMs = (i) => {
    if (milestones.length <= MIN_MILESTONES) {
      return toast.error("You need at least " + MIN_MILESTONES + " milestones.");
    }
    setMilestones(milestones.filter((_, idx) => idx !== i));
  };

  const handleUpdate = (i, field, value) => {
    const updated = [...milestones];
    updated[i] = { ...updated[i], [field]: value };
    setMilestones(updated);
  };

  // Step 1
  const handleRegister = () => {
    if (!campaignId && campaignId !== 0) return toast.error("No campaign ID.");
    const targetWei = campaignTarget
      ? ethers.utils.parseEther(campaignTarget.toString())
      : undefined;
    if (!targetWei || targetWei.isZero())
      return toast.error("Campaign target missing — cannot enable milestones.");
    setStep("confirming");
    register({ args: [campaignId, targetWei] });
  };

  // Step 2
  const handleSaveAll = () => {
    const valid = milestones.filter((m) => m.title.trim() && m.targetEth);
    if (valid.length < MIN_MILESTONES)
      return toast.error("Fill in at least " + MIN_MILESTONES + " milestones.");
    if (campaignTarget) {
      const total = sumEth(valid);
      const cap = parseFloat(campaignTarget.toString());
      if (total > cap)
        return toast.error(
          "Milestone totals (" + total.toFixed(4) + " ETH) exceed campaign target (" + cap.toFixed(4) + " ETH)."
        );
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
    toast.success(valid.length + " milestone" + (valid.length > 1 ? "s" : "") + " submitted!");
    setStep("done");
    if (onDone) setTimeout(onDone, 1500);
  };

  // Budget bar values
  const totalAllocated = sumEth(milestones);
  const campaignTargetNum = parseFloat(campaignTarget?.toString() || "0");
  const budgetUsedPct = campaignTargetNum > 0 ? Math.min((totalAllocated / campaignTargetNum) * 100, 100) : 0;
  const budgetOverflow = campaignTargetNum > 0 && totalAllocated > campaignTargetNum;

  // ── Register step ────────────────────────────────────────────────────────
  if (step === "register") {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-sm font-bold text-white mb-1">Enable Milestone System</h3>
        <p className="text-xs text-slate-400 mb-5">
          Break your project into funded stages. Backers contribute per milestone,
          vote on completion, and receive refunds if one is rejected.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleRegister}
            disabled={registering}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
          >
            {registering ? "Waiting for MetaMask…" : "Enable Milestones"}
          </button>
          {onDone && (
            <button onClick={onDone} className="px-5 py-2.5 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 text-sm transition-colors">
              Skip
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Confirming step (Issue 3 locked screen) ──────────────────────────────
  if (step === "confirming") {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <FiLoader className="w-8 h-8 text-emerald-400 mx-auto mb-3 animate-spin" />
        <h3 className="text-sm font-semibold text-white mb-1">Confirming on-chain…</h3>
        <p className="text-xs text-slate-400">
          Waiting for the registration transaction to be mined. This usually takes 15–30 seconds.
          Do not close or refresh this page.
        </p>
      </div>
    );
  }

  // ── Done step ────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-6 text-center">
        <FiCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-emerald-300 mb-1">Milestones Submitted!</h3>
        <p className="text-xs text-slate-400">Milestones are being recorded on-chain and will appear once confirmed.</p>
      </div>
    );
  }

  // ── Add milestones step ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Add Project Milestones</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Min {MIN_MILESTONES} · Max {MAX_MILESTONES} milestones.
          </p>
        </div>
        <button
          onClick={handleAddMs}
          disabled={milestones.length >= MAX_MILESTONES}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          <FiPlus className="w-3.5 h-3.5" />
          Add ({milestones.length}/{MAX_MILESTONES})
        </button>
      </div>

      {/* Issue 4 — live budget bar */}
      {campaignTargetNum > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Milestone Budget</span>
            <span className={budgetOverflow ? "text-red-400 font-semibold" : "text-slate-300 font-medium"}>
              {totalAllocated.toFixed(4)} / {campaignTargetNum.toFixed(4)} ETH
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className={"h-1.5 rounded-full transition-all " + (budgetOverflow ? "bg-red-500" : "bg-emerald-500")}
              style={{ width: budgetUsedPct + "%" }}
            />
          </div>
          <p className="text-[10px] text-slate-600">
            {Math.max(0, campaignTargetNum - totalAllocated).toFixed(4)} ETH still unallocated
          </p>
        </div>
      )}

      {/* Min-count info */}
      <div className="flex items-start gap-2 px-3 py-2 bg-slate-800/30 border border-slate-700/30 rounded-lg">
        <FiInfo className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-500">
          MetaMask will prompt once per milestone. Define at least{" "}
          <span className="text-slate-300 font-medium">{MIN_MILESTONES}</span> before saving.
        </p>
      </div>

      {/* Milestone cards */}
      {milestones.map((m, i) => (
        <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Milestone {i + 1}
            </span>
            <button
              onClick={() => handleRemoveMs(i)}
              disabled={milestones.length <= MIN_MILESTONES}
              className="text-slate-600 hover:text-red-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              title={milestones.length <= MIN_MILESTONES ? "Minimum " + MIN_MILESTONES + " required" : "Remove"}
            >
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <input
            className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:ring-1 focus:ring-emerald-500/60 outline-none"
            placeholder={"Milestone " + (i + 1) + " title"}
            value={m.title}
            onChange={(e) => handleUpdate(i, "title", e.target.value)}
          />

          <textarea
            className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:ring-1 focus:ring-emerald-500/60 outline-none resize-none"
            placeholder="What will be delivered and how will you prove it?"
            rows={2}
            value={m.description}
            onChange={(e) => handleUpdate(i, "description", e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Target (ETH)</label>
              <input
                type="number" step="0.001" min="0.001"
                className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-emerald-500/60 outline-none"
                placeholder="0.5"
                value={m.targetEth}
                onChange={(e) => handleUpdate(i, "targetEth", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Duration (days)</label>
              <input
                type="number" min="1" max="365"
                className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-emerald-500/60 outline-none"
                placeholder="30"
                value={m.durationDays}
                onChange={(e) => handleUpdate(i, "durationDays", e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Overflow warning */}
      {budgetOverflow && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/40 rounded-lg">
          <FiAlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">
            Milestone totals exceed the campaign goal. Reduce targets before saving.
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSaveAll}
          disabled={creatingMs || budgetOverflow}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
        >
          {creatingMs ? "Submitting…" : "Save " + milestones.filter((m) => m.title).length + " Milestones to Blockchain"}
        </button>
        {onDone && (
          <button onClick={onDone} className="px-5 py-3 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 text-sm transition-colors">
            Done
          </button>
        )}
      </div>
    </div>
  );
}
