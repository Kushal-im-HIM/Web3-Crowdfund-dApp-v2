/**
 * components/GasEstimator.js
 *
 * Idea 6 — Gas estimator before contribution.
 * Shows estimated gas in ETH + USD using wagmi's useFeeData pattern (v1 compatible).
 * Purely additive, shown inline below the amount input.
 */

import { useState, useEffect } from "react";
// In wagmi v1, we use useFeeData to get gas price
import { useFeeData } from "wagmi";
import { FiZap, FiInfo } from "react-icons/fi";

const ETH_USD_CACHE_KEY = "ef_eth_usd_price";
const ETH_USD_CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getCachedEthUsd() {
  try {
    const cached = JSON.parse(localStorage.getItem(ETH_USD_CACHE_KEY) || "{}");
    if (cached.ts && Date.now() - cached.ts < ETH_USD_CACHE_TTL) return cached.price;
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
    const data = await r.json();
    const price = data?.ethereum?.usd || 0;
    if (price) localStorage.setItem(ETH_USD_CACHE_KEY, JSON.stringify({ price, ts: Date.now() }));
    return price;
  } catch { return 2000; } // safe fallback
}

export default function GasEstimator({ amount, contractAddress, abi, campaignId, enabled }) {
  const [ethUsd, setEthUsd] = useState(2000);

  useEffect(() => {
    getCachedEthUsd().then(setEthUsd);
  }, []);

  // wagmi v1: useFeeData returns an object containing gasPrice
  const { data: feeData } = useFeeData({
    watch: true,
    enabled: Boolean(enabled && amount),
  });

  const gasPrice = feeData?.gasPrice;

  // Typical contribution gas: ~65,000 gas units for payable function
  const TYPICAL_GAS = 65000n;

  // Calculate costs
  const gasCostWei = gasPrice ? gasPrice * TYPICAL_GAS : null;
  const gasCostEth = gasCostWei ? Number(gasCostWei) / 1e18 : null;
  const gasCostUsd = gasCostEth ? (gasCostEth * ethUsd) : null;

  if (!enabled || !amount || parseFloat(amount) <= 0) return null;

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-slate-50 dark:bg-primary-900/50 rounded-lg border border-slate-100 dark:border-primary-700">
      <FiZap className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {gasCostEth !== null ? (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Est. gas: ~{gasCostEth.toFixed(6)} ETH
            </span>
            {gasCostUsd !== null && (
              <span className="ml-1">(≈ ${gasCostUsd.toFixed(2)} USD)</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500">Estimating gas...</p>
        )}
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Paid to Ethereum miners · Not to EthosFund
        </p>
      </div>
      <div className="relative group flex-shrink-0">
        <FiInfo className="w-3.5 h-3.5 text-slate-300 cursor-help" />
        <div className="absolute right-0 bottom-5 w-48 bg-slate-900 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
          Gas is estimated. Actual cost varies with network congestion.
        </div>
      </div>
    </div>
  );
}