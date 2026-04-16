/**
 * components/Milestone/MilestoneCreationForm.js
 *
 * FIX — Duration validation (Issue 4):
 *   Milestone durations must sum to exactly the campaign's remaining duration.
 *   - All milestones except the LAST are free-form (with a max cap hint).
 *   - The LAST milestone's duration is auto-computed and locked:
 *       lastDuration = campaignRemainingDays - sum(other milestone durations)
 *   - The form warns when durations exceed or don't fill the campaign window.
 *   - This requires a new `campaignDeadline` prop (UNIX timestamp in seconds).
 *
 * Previous fixes retained:
 *   - wagmi v1 waitForTransaction pattern
 *   - Hours/Days toggle
 *   - Budget bar
 */

import { useState, useMemo } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { useWaitForTransaction } from "wagmi";
import { waitForTransaction } from "@wagmi/core";
import {
  FiPlus, FiTrash2, FiCheck, FiLoader,
  FiAlertTriangle, FiInfo, FiToggleLeft, FiToggleRight, FiLock,
} from "react-icons/fi";
import { useContract } from "../../hooks/useContract";

const MIN_MILESTONES = 2;
const MAX_MILESTONES = 5;
const EMPTY_MS = { title: "", description: "", targetEth: "", durationValue: "", durationUnit: "days" };

function sumEth(ms) {
  return ms.reduce((s, m) => s + parseFloat(m.targetEth || "0"), 0);
}

function toSeconds(m) {
  const val = parseInt(m.durationValue || "0", 10);
  if (!val || val <= 0) return 0;
  return m.durationUnit === "hours" ? val * 3600 : val * 86400;
}

function toDays(m) {
  return toSeconds(m) / 86400;
}

export default function MilestoneCreationForm({ campaignId, campaignTarget, campaignDeadline, onDone }) {
  const { useRegisterCampaignForMilestones, useCreateMilestone } = useContract();

  const [step, setStep] = useState("register");
  const [milestones, setMilestones] = useState(
    Array.from({ length: MIN_MILESTONES }, () => ({ ...EMPTY_MS }))
  );
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });

  const { write: register, isLoading: registering, data: registerData } =
    useRegisterCampaignForMilestones();
  const { writeAsync: createMsAsync } = useCreateMilestone();

  useWaitForTransaction({
    hash: registerData?.hash,
    enabled: Boolean(registerData?.hash),
    onSuccess: () => { toast.success("Milestone system confirmed on-chain!"); setStep("add"); },
    onError: (err) => { toast.error("Registration failed: " + (err?.message ?? "unknown")); setStep("register"); },
  });

  // ── Duration calculation ─────────────────────────────────────────────────
  // campaignRemainingDays: how many days remain until the campaign deadline
  const campaignRemainingDays = useMemo(() => {
    if (!campaignDeadline) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    const remaining = Number(campaignDeadline) - nowSec;
    return remaining > 0 ? remaining / 86400 : 0;
  }, [campaignDeadline]);

  // Sum of ALL milestone durations in days (for overflow check)
  const totalMilestoneDays = useMemo(() =>
    milestones.reduce((sum, m) => sum + toDays(m), 0),
    [milestones]
  );

  // For each milestone i, how many days are used by milestones BEFORE it
  const daysUsedBefore = useMemo(() =>
    milestones.map((_, i) =>
      milestones.slice(0, i).reduce((sum, m) => sum + toDays(m), 0)
    ),
    [milestones]
  );

  // Last milestone's duration is auto-locked
  const lastIdx = milestones.length - 1;
  const lastLockedDays = useMemo(() => {
    if (campaignRemainingDays === null) return null;
    const otherDays = milestones.slice(0, lastIdx).reduce((sum, m) => sum + toDays(m), 0);
    const locked = campaignRemainingDays - otherDays;
    return locked > 0 ? locked : 0;
  }, [campaignRemainingDays, milestones, lastIdx]);

  const durationOverflow = campaignRemainingDays !== null && totalMilestoneDays > campaignRemainingDays + 0.01;
  const durationUnderflow = campaignRemainingDays !== null && milestones.some(m => toDays(m) > 0) &&
    Math.abs(totalMilestoneDays - campaignRemainingDays) > 0.5;

  // ── List helpers ─────────────────────────────────────────────────────────
  const handleAddMs = () => {
    if (milestones.length >= MAX_MILESTONES) return toast.error(`Maximum ${MAX_MILESTONES} milestones.`);
    setMilestones([...milestones, { ...EMPTY_MS }]);
  };
  const handleRemoveMs = (i) => {
    if (milestones.length <= MIN_MILESTONES) return toast.error(`At least ${MIN_MILESTONES} required.`);
    setMilestones(milestones.filter((_, idx) => idx !== i));
  };
  const handleUpdate = (i, field, value) => {
    // Don't allow editing last milestone duration — it's auto-locked
    if (i === lastIdx && (field === "durationValue" || field === "durationUnit")) return;
    const u = [...milestones];
    u[i] = { ...u[i], [field]: value };
    setMilestones(u);
  };
  const toggleUnit = (i) => {
    if (i === lastIdx) return; // last milestone duration is locked
    const u = [...milestones];
    u[i] = { ...u[i], durationUnit: u[i].durationUnit === "days" ? "hours" : "days", durationValue: "" };
    setMilestones(u);
  };

  // ── Step 1 ───────────────────────────────────────────────────────────────
  const handleRegister = () => {
    if (!campaignId && campaignId !== 0) return toast.error("No campaign ID.");
    setStep("confirming");
    register({ args: [campaignId] });
  };

  // ── Step 2 ───────────────────────────────────────────────────────────────
  const handleSaveAll = async () => {
    const valid = milestones.filter((m) => m.title.trim() && m.targetEth);
    if (valid.length < MIN_MILESTONES)
      return toast.error(`Fill in at least ${MIN_MILESTONES} milestones.`);

    // Duration validation
    if (campaignRemainingDays !== null) {
      for (let i = 0; i < valid.length - 1; i++) {
        if (toSeconds(valid[i]) <= 0)
          return toast.error(`Milestone ${i + 1}: duration must be > 0.`);
      }
      // Set last milestone duration to the locked value
      const otherDays = valid.slice(0, -1).reduce((sum, m) => sum + toDays(m), 0);
      const lockedDays = campaignRemainingDays - otherDays;
      if (lockedDays <= 0)
        return toast.error("Other milestones consume the full campaign duration. Reduce their durations.");
      // Override last milestone's duration to the auto-calculated value
      valid[valid.length - 1] = {
        ...valid[valid.length - 1],
        durationValue: String(Math.round(lockedDays)),
        durationUnit: "days",
      };
    } else {
      for (let i = 0; i < valid.length; i++) {
        if (toSeconds(valid[i]) <= 0)
          return toast.error(`Milestone ${i + 1}: duration must be > 0 ${valid[i].durationUnit}.`);
      }
    }

    if (campaignTarget) {
      const total = sumEth(valid);
      const cap = parseFloat(campaignTarget.toString());
      if (total > cap)
        return toast.error(`Totals (${total.toFixed(4)} ETH) exceed target (${cap.toFixed(4)} ETH).`);
    }

    if (!createMsAsync) return toast.error("Contract not ready — reconnect wallet.");

    setStep("saving");
    setSaveProgress({ current: 0, total: valid.length });

    try {
      for (let i = 0; i < valid.length; i++) {
        const m = valid[i];
        setSaveProgress({ current: i + 1, total: valid.length });
        const result = await createMsAsync({
          args: [
            campaignId,
            m.title.trim(),
            m.description.trim(),
            ethers.utils.parseEther(m.targetEth),
            BigInt(toSeconds(m)),
          ],
        });
        await waitForTransaction({ hash: result.hash, confirmations: 1 });
        toast.success(`Milestone ${i + 1} of ${valid.length} confirmed on-chain.`);
      }
      setStep("done");
      toast.success("All milestones confirmed!");
      if (onDone) setTimeout(onDone, 1500);
    } catch (err) {
      const msg = err?.message || "Transaction failed";
      if (/user rejected|user denied/i.test(msg)) {
        toast.error("Transaction rejected in MetaMask.");
      } else {
        toast.error("Milestone creation failed: " + msg.slice(0, 120));
      }
      setStep("add");
      setSaveProgress({ current: 0, total: 0 });
    }
  };

  // ── Budget bar ────────────────────────────────────────────────────────────
  const totalAllocated = sumEth(milestones);
  const campaignTargetNum = parseFloat(campaignTarget?.toString() || "0");
  const budgetUsedPct = campaignTargetNum > 0 ? Math.min((totalAllocated / campaignTargetNum) * 100, 100) : 0;
  const budgetOverflow = campaignTargetNum > 0 && totalAllocated > campaignTargetNum;

  // ── Render: register ──────────────────────────────────────────────────────
  if (step === "register") return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-700/50 space-y-3">
      <h3 className="text-sm font-bold text-white mb-1">Enable Milestone System</h3>
      <p className="text-xs text-slate-400">This one-time setup registers your campaign for milestone-based fund releases. Requires 1 MetaMask confirmation.</p>
      <button onClick={handleRegister} disabled={registering}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
        {registering ? <><FiLoader className="w-4 h-4 animate-spin" /> Waiting for MetaMask…</> : "Enable Milestones"}
      </button>
    </div>
  );

  if (step === "confirming") return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-700/50 text-center space-y-3">
      <FiLoader className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
      <p className="text-sm text-slate-300">Confirming milestone registration on-chain…</p>
    </div>
  );

  if (step === "saving") return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-700/50 text-center space-y-3">
      <FiLoader className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
      <p className="text-sm text-slate-300">
        Confirming milestone <strong>{saveProgress.current}</strong> of{" "}
        <strong>{saveProgress.total}</strong> on-chain…
      </p>
      <p className="text-xs text-slate-500">Keep this page open. Do not navigate away.</p>
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div className="h-1.5 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${(saveProgress.current / saveProgress.total) * 100}%` }} />
      </div>
    </div>
  );

  if (step === "done") return (
    <div className="bg-slate-900 rounded-xl p-5 border border-emerald-600/30 text-center space-y-3">
      <FiCheck className="w-8 h-8 text-emerald-400 mx-auto" />
      <h3 className="text-sm font-bold text-emerald-300 mb-1">All Milestones Confirmed!</h3>
      <p className="text-xs text-slate-400">Your milestones are live on-chain. Funds will be released as each milestone is approved by the community.</p>
    </div>
  );

  // ── Render: add milestones form ────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Add Project Milestones</h3>
          <p className="text-xs text-slate-500 mt-0.5">Min {MIN_MILESTONES} · Max {MAX_MILESTONES}.</p>
        </div>
        <button onClick={handleAddMs} disabled={milestones.length >= MAX_MILESTONES}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 disabled:cursor-not-allowed">
          <FiPlus className="w-3.5 h-3.5" /> Add ({milestones.length}/{MAX_MILESTONES})
        </button>
      </div>

      {/* Budget bar */}
      {campaignTargetNum > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Milestone Budget</span>
            <span className={budgetOverflow ? "text-red-400 font-semibold" : "text-slate-300 font-medium"}>
              {totalAllocated.toFixed(4)} / {campaignTargetNum.toFixed(4)} ETH
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div className={"h-1.5 rounded-full transition-all " + (budgetOverflow ? "bg-red-500" : "bg-emerald-500")}
              style={{ width: budgetUsedPct + "%" }} />
          </div>
          <p className="text-[10px] text-slate-600">{Math.max(0, campaignTargetNum - totalAllocated).toFixed(4)} ETH unallocated</p>
        </div>
      )}

      {/* Duration summary bar */}
      {campaignRemainingDays !== null && campaignRemainingDays > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Campaign Duration</span>
            <span className={durationOverflow ? "text-red-400 font-semibold" : "text-slate-300 font-medium"}>
              {totalMilestoneDays.toFixed(1)} / {campaignRemainingDays.toFixed(1)} days used
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div className={"h-1.5 rounded-full transition-all " + (durationOverflow ? "bg-red-500" : "bg-blue-400")}
              style={{ width: `${Math.min((totalMilestoneDays / campaignRemainingDays) * 100, 100)}%` }} />
          </div>
          <p className="text-[10px] text-slate-500">
            Last milestone locks at <span className="text-slate-300 font-medium">{(lastLockedDays ?? 0).toFixed(1)} days</span> automatically
          </p>
        </div>
      )}

      <div className="flex items-start gap-2 px-3 py-2 bg-slate-800/30 border border-slate-700/30 rounded-lg">
        <FiInfo className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-500">
          MetaMask prompts once per milestone — confirmed sequentially.
          Fill at least <span className="text-slate-300 font-medium">{MIN_MILESTONES}</span> then do not navigate away during saving.
        </p>
      </div>

      {milestones.map((m, i) => {
        const isLast = i === lastIdx;
        const maxDaysForThis = campaignRemainingDays !== null
          ? campaignRemainingDays - daysUsedBefore[i] - (milestones.length - 1 - i) * 1 // at least 1 day per subsequent milestone
          : null;
        const lockedDisplay = isLast && lastLockedDays !== null
          ? `${Math.max(0, lastLockedDays).toFixed(1)} days (auto)`
          : null;

        return (
          <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Milestone {i + 1}</span>
                {isLast && <span className="text-[9px] bg-blue-900/30 text-blue-400 border border-blue-800/30 px-2 py-0.5 rounded-full">Final</span>}
              </div>
              <button onClick={() => handleRemoveMs(i)} disabled={milestones.length <= MIN_MILESTONES}
                className="text-slate-600 hover:text-red-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <input className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:ring-1 focus:ring-emerald-500/60 outline-none"
              placeholder={`Milestone ${i + 1} title`} value={m.title}
              onChange={(e) => handleUpdate(i, "title", e.target.value)} />

            <textarea className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:ring-1 focus:ring-emerald-500/60 outline-none resize-none"
              placeholder="What will be delivered and how will you prove it?" rows={2} value={m.description}
              onChange={(e) => handleUpdate(i, "description", e.target.value)} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Target (ETH)</label>
                <input type="number" step="0.001" min="0.001"
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-emerald-500/60 outline-none"
                  placeholder="0.5" value={m.targetEth} onChange={(e) => handleUpdate(i, "targetEth", e.target.value)} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Duration</label>
                  {!isLast && (
                    <button type="button" onClick={() => toggleUnit(i)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                      {m.durationUnit === "days" ? <FiToggleLeft className="w-3.5 h-3.5" /> : <FiToggleRight className="w-3.5 h-3.5" />}
                      {m.durationUnit === "days" ? "Days" : "Hours"}
                    </button>
                  )}
                  {isLast && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-400">
                      <FiLock className="w-3 h-3" /> Auto
                    </span>
                  )}
                </div>

                {isLast ? (
                  /* Last milestone: locked display */
                  <div className="relative">
                    <div className="w-full bg-slate-800 border border-blue-800/40 rounded-lg px-3 py-2.5 text-sm text-blue-300 font-medium flex items-center gap-2">
                      <FiLock className="w-3.5 h-3.5 text-blue-400/60 flex-shrink-0" />
                      {lockedDisplay ?? "fill previous first"}
                    </div>
                  </div>
                ) : (
                  /* Non-last milestones: editable with max hint */
                  <div className="relative">
                    <input type="number" min="1"
                      max={maxDaysForThis !== null && m.durationUnit === "days"
                        ? Math.max(1, Math.floor(maxDaysForThis))
                        : m.durationUnit === "hours" ? "8760" : "365"}
                      className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-emerald-500/60 outline-none pr-14"
                      placeholder={m.durationUnit === "hours" ? "8" : "1"}
                      value={m.durationValue}
                      onChange={(e) => handleUpdate(i, "durationValue", e.target.value)} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">
                      {m.durationUnit}
                    </span>
                  </div>
                )}

                {/* Hint for non-last milestones */}
                {!isLast && maxDaysForThis !== null && maxDaysForThis > 0 && (
                  <p className="text-[10px] text-slate-600 mt-1">
                    Max <span className="text-slate-400">{Math.floor(maxDaysForThis)} days</span> (leaves room for later milestones)
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {budgetOverflow && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/40 rounded-lg">
          <FiAlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">Milestone totals exceed campaign goal. Reduce targets before saving.</p>
        </div>
      )}

      {durationOverflow && !budgetOverflow && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/40 rounded-lg">
          <FiAlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">Milestone durations exceed campaign window. Reduce durations for earlier milestones.</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={handleSaveAll} disabled={budgetOverflow || durationOverflow}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-lg transition-colors text-sm disabled:cursor-not-allowed">
          Save {milestones.filter((m) => m.title).length} Milestones to Blockchain
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
