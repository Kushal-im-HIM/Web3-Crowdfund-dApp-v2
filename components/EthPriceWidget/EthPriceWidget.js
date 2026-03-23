import { useState, useEffect, useCallback } from "react";
import { FiRefreshCw, FiTrendingUp, FiTrendingDown, FiWifi, FiWifiOff } from "react-icons/fi";

// CoinGecko free-tier endpoint — no API key required.
// Fetches ETH price in USD and INR with 24-hour change percentage.
const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,inr&include_24hr_change=true";

const REFRESH_INTERVAL_MS = 60_000; // 60 seconds

function Skeleton({ className }) {
  return (
    <div className={`animate-pulse rounded bg-slate-700/60 ${className}`} />
  );
}

export default function EthPriceWidget({ isCollapsed }) {
  const [price, setPrice]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [spinning, setSpinning]     = useState(false);
  const [error, setError]           = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown]   = useState(REFRESH_INTERVAL_MS / 1000);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchPrice = useCallback(async (manual = false) => {
    if (manual) setSpinning(true);
    setError(null);
    try {
      const res = await fetch(COINGECKO_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPrice({
        usd:       data.ethereum.usd,
        inr:       data.ethereum.inr,
        change24h: data.ethereum.usd_24h_change ?? 0,
      });
      setLastUpdated(new Date());
      setCountdown(REFRESH_INTERVAL_MS / 1000);
    } catch (err) {
      setError("Price unavailable");
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  // ── Auto-refresh ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPrice();
    const refreshTimer  = setInterval(() => fetchPrice(), REFRESH_INTERVAL_MS);
    const countdownTimer = setInterval(() =>
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL_MS / 1000 : c - 1)), 1000
    );
    return () => {
      clearInterval(refreshTimer);
      clearInterval(countdownTimer);
    };
  }, [fetchPrice]);

  // ── Collapsed state — show just the Ξ icon ───────────────────────────────
  if (isCollapsed) {
    return (
      <div className="flex justify-center py-3 px-2">
        <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center">
          <span className="text-sm font-black text-emerald-400">Ξ</span>
        </div>
      </div>
    );
  }

  // ── Loading skeleton (first load only) ──────────────────────────────────
  if (loading && !price) {
    return (
      <div className="mx-3 mb-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700/40 space-y-2.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-3 w-3 rounded-full" />
        </div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-16 ml-auto" />
      </div>
    );
  }

  const isPositive = (price?.change24h ?? 0) >= 0;

  return (
    <div className="mx-3 mb-3 rounded-xl bg-slate-800/70 border border-slate-700/40 overflow-hidden">
      
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-1.5">
          {/* Ethereum logo pill */}
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-sm">
            <span className="text-[9px] font-black text-white leading-none">Ξ</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            ETH / USD · INR
          </span>
        </div>

        <button
          onClick={() => fetchPrice(true)}
          disabled={spinning}
          title="Refresh now"
          className="text-slate-500 hover:text-emerald-400 disabled:opacity-40 transition-colors"
        >
          <FiRefreshCw className={`w-3 h-3 ${spinning ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-700/40 mx-3" />

      {/* Price body */}
      <div className="px-3 py-2.5">
        {error ? (
          <div className="flex items-center gap-1.5 text-red-400">
            <FiWifiOff className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs">{error}</span>
          </div>
        ) : price ? (
          <>
            {/* USD row */}
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-white tracking-tight">
                ${price.usd.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              {/* 24h change badge */}
              <span
                className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isPositive
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-red-400 bg-red-500/10"
                }`}
              >
                {isPositive
                  ? <FiTrendingUp className="w-3 h-3" />
                  : <FiTrendingDown className="w-3 h-3" />}
                {isPositive ? "+" : ""}
                {price.change24h.toFixed(2)}%
              </span>
            </div>

            {/* INR row */}
            <div className="text-[11px] text-slate-400 mt-0.5">
              ₹
              {price.inr.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </div>

            {/* Footer: last-updated + countdown */}
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-700/30">
              <div className="flex items-center gap-1 text-[9px] text-slate-600">
                <FiWifi className="w-2.5 h-2.5 text-emerald-600" />
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </div>
              <span className="text-[9px] text-slate-600">
                refresh in {countdown}s
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
