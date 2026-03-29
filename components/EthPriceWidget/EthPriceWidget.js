import { useState, useEffect, useCallback } from "react";
import {
  FiRefreshCw,
  FiTrendingUp,
  FiTrendingDown,
  FiWifi,
  FiWifiOff,
  FiBarChart2,
} from "react-icons/fi";

// Extended CoinGecko call — adds market_cap and 24h_vol at no extra cost
const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum" +
  "&vs_currencies=usd,inr" +
  "&include_24hr_change=true" +
  "&include_market_cap=true" +
  "&include_24hr_vol=true";

const REFRESH_INTERVAL_MS = 60_000;

function Skeleton({ className }) {
  return (
    <div className={`animate-pulse rounded bg-slate-700/60 ${className}`} />
  );
}

/** Compact abbreviation: 1_234_567_890 → "$1.23B" */
function formatCompact(value, prefix = "$") {
  if (value >= 1e9) return `${prefix}${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${prefix}${(value / 1e6).toFixed(1)}M`;
  return `${prefix}${value.toLocaleString()}`;
}

export default function EthPriceWidget({ isCollapsed }) {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_MS / 1000);
  const [pulse, setPulse] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPrice = useCallback(async (manual = false) => {
    if (manual) setSpinning(true);
    setError(null);
    try {
      const res = await fetch(COINGECKO_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPrice({
        usd: data.ethereum.usd,
        inr: data.ethereum.inr,
        change24h: data.ethereum.usd_24h_change ?? 0,
        marketCap: data.ethereum.usd_market_cap ?? null,
        vol24h: data.ethereum.usd_24h_vol ?? null,
      });
      setLastUpdated(new Date());
      setCountdown(REFRESH_INTERVAL_MS / 1000);
      // brief pulse animation on each update
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);
    } catch (err) {
      setError("Price unavailable");
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  // ── Timers ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPrice();
    const refreshTimer = setInterval(() => fetchPrice(), REFRESH_INTERVAL_MS);
    const countdownTimer = setInterval(() =>
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL_MS / 1000 : c - 1)), 1000
    );
    return () => {
      clearInterval(refreshTimer);
      clearInterval(countdownTimer);
    };
  }, [fetchPrice]);

  // ── Collapsed state ─────────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <div className="flex justify-center py-3 px-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg">
          <span className="text-sm font-black text-white">Ξ</span>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading && !price) {
    return (
      <div className="mx-3 mb-3 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/40 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
        </div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-28" />
        <div className="h-1.5 bg-slate-700/60 rounded-full" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
        <Skeleton className="h-3 w-20 ml-auto" />
      </div>
    );
  }

  const isPositive = (price?.change24h ?? 0) >= 0;
  const changePct = Math.abs(price?.change24h ?? 0);
  // bar fill: cap at 100%, scale so ±10% fills the bar
  const barFill = Math.min(100, Math.max(2, (changePct / 10) * 100));

  return (
    <div className="mx-3 mb-3 rounded-2xl bg-slate-800/80 border border-slate-700/40 overflow-hidden shadow-lg">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          {/* Live pulse dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {pulse && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-sm shrink-0">
            <span className="text-[11px] font-black text-white leading-none">Ξ</span>
          </div>
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            ETH / USD · INR
          </span>
        </div>

        <button
          onClick={() => fetchPrice(true)}
          disabled={spinning}
          title="Refresh"
          className="text-slate-500 hover:text-emerald-400 disabled:opacity-40 transition-colors p-1"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${spinning ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="h-px bg-slate-700/40 mx-4" />

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3">
        {error ? (
          <div className="flex items-center gap-2 text-red-400 py-2">
            <FiWifiOff className="w-4 h-4 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        ) : price ? (
          <>
            {/* USD price — large & bold */}
            <div className="flex items-end justify-between gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white tracking-tight leading-none">
                ${price.usd.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>

              {/* 24h change badge */}
              <span
                className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full shrink-0 ${isPositive
                    ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/20"
                    : "text-red-300 bg-red-500/15 border border-red-500/20"
                  }`}
              >
                {isPositive
                  ? <FiTrendingUp className="w-3.5 h-3.5" />
                  : <FiTrendingDown className="w-3.5 h-3.5" />}
                {isPositive ? "+" : "-"}{changePct.toFixed(2)}%
              </span>
            </div>

            {/* INR price */}
            <div className="text-sm font-semibold text-slate-300 mt-1.5">
              ₹{price.inr.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>

            {/* 24h change bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>24h movement</span>
                <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                  {isPositive ? "▲" : "▼"} {changePct.toFixed(2)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-700/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isPositive
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                      : "bg-gradient-to-r from-red-500 to-orange-400"
                    }`}
                  style={{ width: `${barFill}%` }}
                />
              </div>
            </div>

            {/* Market cap + 24h volume grid */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-slate-700/40 rounded-xl px-3 py-2.5 border border-slate-600/20">
                <div className="flex items-center gap-1 mb-1">
                  <FiBarChart2 className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Mkt Cap</span>
                </div>
                <span className="text-sm font-bold text-slate-200">
                  {price.marketCap ? formatCompact(price.marketCap) : "—"}
                </span>
              </div>

              <div className="bg-slate-700/40 rounded-xl px-3 py-2.5 border border-slate-600/20">
                <div className="flex items-center gap-1 mb-1">
                  <FiTrendingUp className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">24h Vol</span>
                </div>
                <span className="text-sm font-bold text-slate-200">
                  {price.vol24h ? formatCompact(price.vol24h) : "—"}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-700/30">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <FiWifi className="w-3 h-3 text-emerald-600" />
                <span>
                  {lastUpdated
                    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </span>
              </div>
              <span className="text-[10px] text-slate-600">
                refresh in {countdown}s
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}