/**
 * components/Campaign/MilestoneTimeline.js
 *
 * Idea 4 — Progress timeline on campaign detail.
 * Vertical timeline of milestones with status, amount, and vote context.
 * Replaces the bare dot indicators. Data comes from MilestonePanel's existing hook.
 */

import { FiCheckCircle, FiClock, FiLoader, FiXCircle, FiLock, FiRefreshCw } from "react-icons/fi";

// Milestone status integers from Solidity enum
const STATUS = {
  0: { label: "Pending",   icon: FiClock,        color: "#94a3b8",  bg: "#f1f5f9",  darkBg: "rgba(100,116,139,0.15)" },
  1: { label: "Active",    icon: FiLoader,       color: "#f59e0b",  bg: "#fffbeb",  darkBg: "rgba(245,158,11,0.15)" },
  2: { label: "Voting",    icon: FiClock,        color: "#6366f1",  bg: "#eef2ff",  darkBg: "rgba(99,102,241,0.15)" },
  3: { label: "Approved",  icon: FiCheckCircle,  color: "#10b981",  bg: "#ecfdf5",  darkBg: "rgba(16,185,129,0.15)" },
  4: { label: "Released",  icon: FiLock,         color: "#10b981",  bg: "#ecfdf5",  darkBg: "rgba(16,185,129,0.15)" },
  5: { label: "Refunded",  icon: FiRefreshCw,    color: "#ef4444",  bg: "#fef2f2",  darkBg: "rgba(239,68,68,0.15)" },
  6: { label: "Rejected",  icon: FiXCircle,      color: "#ef4444",  bg: "#fef2f2",  darkBg: "rgba(239,68,68,0.15)" },
};

function formatEth(val) {
  if (!val) return "0.00";
  try {
    const n = typeof val === "bigint" ? Number(val) : Number(val.toString());
    return (n / 1e18).toFixed(4);
  } catch { return "0.00"; }
}

export default function MilestoneTimeline({ milestones = [], targetAmount }) {
  if (!milestones || milestones.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
        No milestones configured yet.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-emerald-100 dark:bg-primary-700" style={{ zIndex: 0 }} />

      <div className="space-y-4 relative" style={{ zIndex: 1 }}>
        {milestones.map((m, i) => {
          const stNum = Number(m.status ?? 0);
          const st = STATUS[stNum] ?? STATUS[0];
          const Icon = st.icon;
          const isComplete = stNum === 4 || stNum === 3;
          const releaseEth = formatEth(m.releaseAmount);
          const pct = targetAmount && Number(m.releaseAmount)
            ? ((Number(m.releaseAmount) / (Number(targetAmount))) * 100).toFixed(0)
            : null;

          return (
            <div key={i} className="flex gap-4 items-start">
              {/* Node */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all`}
                style={{
                  background: st.bg,
                  borderColor: st.color,
                  boxShadow: isComplete ? `0 0 12px ${st.color}40` : "none",
                }}
              >
                <Icon style={{ width: 16, height: 16, color: st.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 bg-white dark:bg-primary-800 rounded-xl border border-emerald-100 dark:border-primary-700 p-4 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-slate-900 dark:text-white text-sm">
                        Milestone {i + 1}
                      </span>
                      {m.title && (
                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                          · {m.title}
                        </span>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {m.description}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  {releaseEth !== "0.00" && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Release:</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-display">
                        {releaseEth} ETH
                        {pct && <span className="text-slate-400 font-normal ml-1">({pct}%)</span>}
                      </span>
                    </div>
                  )}
                  {m.deadline && Number(m.deadline) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Due:</span>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {new Date(Number(m.deadline) * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Vote bar — shown when voting or approved/rejected */}
                {(stNum === 2 || stNum === 3 || stNum === 6) && m.votesFor !== undefined && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        For: {Number(m.votesFor || 0)}
                      </span>
                      <span className="text-red-500">
                        Against: {Number(m.votesAgainst || 0)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-primary-700 rounded-full overflow-hidden">
                      {(() => {
                        const total = Number(m.votesFor || 0) + Number(m.votesAgainst || 0);
                        const pctFor = total > 0 ? (Number(m.votesFor || 0) / total) * 100 : 0;
                        return (
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                            style={{ width: `${pctFor}%` }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
