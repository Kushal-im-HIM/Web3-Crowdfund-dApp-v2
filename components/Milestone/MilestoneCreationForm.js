/**
 * components/Milestone/MilestoneCreationForm.js
 *
 * FIX — "txResponse.wait is not a function"
 *
 * ROOT CAUSE:
 *   In wagmi v1, `useContractWrite.writeAsync()` resolves to:
 *     { hash: `0x${string}` }   ← a SendTransactionResult
 *   NOT an ethers TransactionResponse (which has .wait()).
 *
 *   Our previous fix called `await txResponse.wait(1)` which threw
 *   "txResponse.wait is not a function" because wagmi's result object
 *   has no `.wait` method.
 *
 * CORRECT WAGMI v1 PATTERN:
 *   import { waitForTransaction } from '@wagmi/core'
 *   const result = await writeAsync({...})   // result = { hash }
 *   await waitForTransaction({ hash: result.hash, confirmations: 1 })
 *
 *   `waitForTransaction` from `@wagmi/core` is the imperative API that
 *   resolves to a TransactionReceipt once the tx is mined.
 *   It uses the same provider configuration as the rest of the wagmi setup.
 *
 * STATE MACHINE (unchanged externally):
 *   register → confirming → add → saving (progress 1/N … N/N) → done
 *
 * Issue 1: Hours/Days toggle preserved.
 */

import { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { useWaitForTransaction } from "wagmi";
import { waitForTransaction } from "@wagmi/core";   // ← the correct wagmi v1 import
import {
  FiPlus, FiTrash2, FiCheck, FiLoader,
  FiAlertTriangle, FiInfo, FiToggleLeft, FiToggleRight,
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

export default function MilestoneCreationForm({ campaignId, campaignTarget, onDone }) {
  const { useRegisterCampaignForMilestones, useCreateMilestone } = useContract();

  const [step, setStep] = useState("register");
  const [milestones, setMilestones] = useState(
    Array.from({ length: MIN_MILESTONES }, () => ({ ...EMPTY_MS }))
  );
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });

  const { write: register, isLoading: registering, data: registerData } =
    useRegisterCampaignForMilestones();

  // FIX: writeAsync — wagmi v1 returns { hash }, not a TransactionResponse
  const { writeAsync: createMsAsync } = useCreateMilestone();

  useWaitForTransaction({
    hash: registerData?.hash,
    enabled: Boolean(registerData?.hash),
    onSuccess: () => { toast.success("Milestone system confirmed on-chain!"); setStep("add"); },
    onError: (err) => { toast.error("Registration failed: " + (err?.message ?? "unknown")); setStep("register"); },
  });

  // ── List helpers ──────────────────────────────────────────────────────────
  const handleAddMs = () => {
    if (milestones.length >= MAX_MILESTONES) return toast.error(`Maximum ${MAX_MILESTONES} milestones.`);
    setMilestones([...milestones, { ...EMPTY_MS }]);
  };
  const handleRemoveMs = (i) => {
    if (milestones.length <= MIN_MILESTONES) return toast.error(`At least ${MIN_MILESTONES} required.`);
    setMilestones(milestones.filter((_, idx) => idx !== i));
  };
  const handleUpdate = (i, field, value) => {
    const u = [...milestones]; u[i] = { ...u[i], [field]: value }; setMilestones(u);
  };
  const toggleUnit = (i) => {
    const u = [...milestones];
    u[i] = { ...u[i], durationUnit: u[i].durationUnit === "days" ? "hours" : "days", durationValue: "" };
    setMilestones(u);
  };

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const handleRegister = () => {
    if (!campaignId && campaignId !== 0) return toast.error("No campaign ID.");
    setStep("confirming");
    register({ args: [campaignId] });
  };

  // ── Step 2: sequential milestone creation using wagmi v1 correct pattern ──
  const handleSaveAll = async () => {
    const valid = milestones.filter((m) => m.title.trim() && m.targetEth);
    if (valid.length < MIN_MILESTONES)
      return toast.error(`Fill in at least ${MIN_MILESTONES} milestones.`);

    for (let i = 0; i < valid.length; i++) {
      if (toSeconds(valid[i]) <= 0)
        return toast.error(`Milestone ${i + 1}: duration must be > 0 ${valid[i].durationUnit}.`);
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

        // writeAsync resolves to { hash: string } in wagmi v1
        const result = await createMsAsync({
          args: [
            campaignId,
            m.title.trim(),
            m.description.trim(),
            ethers.utils.parseEther(m.targetEth),
            BigInt(toSeconds(m)),
          ],
        });

        // FIX: use waitForTransaction from @wagmi/core — NOT result.wait()
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

  // ── Budget bar ─────────────────────────────────────────────────────────────
  const totalAllocated = sumEth(milestones);
  const campaignTargetNum = parseFloat(campaignTarget?.toString() || "0");
  const budgetUsedPct = campaignTargetNum > 0 ? Math.min((totalAllocated / campaignTargetNum) * 100, 100) : 0;
  const budgetOverflow = campaignTargetNum > 0 && totalAllocated > campaignTargetNum;

  // ── Render: register ───────────────────────────────────────────────────────
  if (step === "register") return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-sm font-bold text-white mb-1">Enable Milestone System</h3>
      <p className="text-xs text-slate-400 mb-5">
        Break your project into funded stages. Backers vote on completion; refunds if rejected.
      </p>
      <div className="flex gap-3">
        <button onClick={handleRegister} disabled={registering}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm disabled:cursor-not-allowed">
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

  // ── Render: confirming registration ────────────────────────────────────────
  if (step === "confirming") return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
      <FiLoader className="w-8 h-8 text-emerald-400 mx-auto mb-3 animate-spin" />
      <h3 className="text-sm font-semibold text-white mb-1">Confirming on-chain…</h3>
      <p className="text-xs text-slate-400">Do not close this page.</p>
    </div>
  );

  // ── Render: saving with sequential progress ────────────────────────────────
  if (step === "saving") return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
      <FiLoader className="w-8 h-8 text-emerald-400 mx-auto mb-3 animate-spin" />
      <h3 className="text-sm font-semibold text-white mb-1">Syncing with Blockchain…</h3>
      <p className="text-xs text-slate-400 mb-3">
        Confirming milestone <strong>{saveProgress.current}</strong> of{" "}
        <strong>{saveProgress.total}</strong> — each needs a separate MetaMask approval.
        Do not close this page.
      </p>
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div className="h-1.5 bg-emerald-500 rounded-full transition-all"
          style={{ width: saveProgress.total > 0 ? `${((saveProgress.current - 0.5) / saveProgress.total) * 100}%` : "0%" }} />
      </div>
    </div>
  );

  // ── Render: done ───────────────────────────────────────────────────────────
  if (step === "done") return (
    <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-6 text-center">
      <FiCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
      <h3 className="text-sm font-bold text-emerald-300 mb-1">All Milestones Confirmed!</h3>
      <p className="text-xs text-slate-400">All transactions mined and live on-chain.</p>
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

      <div className="flex items-start gap-2 px-3 py-2 bg-slate-800/30 border border-slate-700/30 rounded-lg">
        <FiInfo className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-500">
          MetaMask prompts once per milestone — confirmed sequentially.
          Fill at least <span className="text-slate-300 font-medium">{MIN_MILESTONES}</span> then do not navigate away during saving.
        </p>
      </div>

      {milestones.map((m, i) => (
        <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Milestone {i + 1}</span>
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
                <button type="button" onClick={() => toggleUnit(i)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                  {m.durationUnit === "days" ? <FiToggleLeft className="w-3.5 h-3.5" /> : <FiToggleRight className="w-3.5 h-3.5" />}
                  {m.durationUnit === "days" ? "Days" : "Hours"}
                </button>
              </div>
              <div className="relative">
                <input type="number" min="1" max={m.durationUnit === "hours" ? "8760" : "365"}
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-emerald-500/60 outline-none pr-14"
                  placeholder={m.durationUnit === "hours" ? "8" : "30"} value={m.durationValue}
                  onChange={(e) => handleUpdate(i, "durationValue", e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">
                  {m.durationUnit}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {budgetOverflow && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/40 rounded-lg">
          <FiAlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">Milestone totals exceed campaign goal. Reduce targets before saving.</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={handleSaveAll} disabled={budgetOverflow}
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
