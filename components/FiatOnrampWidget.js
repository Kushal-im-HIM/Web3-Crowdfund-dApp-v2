/**
 * components/FiatOnrampWidget.js
 *
 * UPDATED v2:
 *   - Removed Google Pay badge (Indian users confuse with UPI/INR — it only
 *     works in USD/EUR/GBP contexts anyway)
 *   - Added "Indian Users" tab pointing to CoinDCX, CoinSwitch, WazirX
 *     with deep-link buy URLs — no iframe, just redirect buttons
 *   - MoonPay sandbox iframe for international card payments
 *
 * Tabs: "International Card" | "India (INR)"
 */

import { useState } from "react";
import {
  FiX, FiCreditCard, FiShield, FiExternalLink,
  FiAlertCircle, FiGlobe, FiMapPin,
} from "react-icons/fi";

const MOONPAY_SANDBOX_URL =
  "https://buy-sandbox.moonpay.com/?apiKey=pk_test_123&currencyCode=eth&colorCode=%2310b981&theme=light";

const INDIAN_EXCHANGES = [
  {
    name: "CoinDCX",
    desc: "India's largest crypto exchange. Buy ETH with UPI, Net Banking, or bank transfer.",
    url: "https://coindcx.com/trade/ETHINR",
    color: "from-blue-500 to-blue-600",
    badge: "Most Popular",
  },
  {
    name: "CoinSwitch",
    desc: "Buy ETH in INR with UPI or debit card. Regulated by FIU-IND.",
    url: "https://coinswitch.co/buy-crypto/buy-ethereum-eth",
    color: "from-purple-500 to-purple-600",
    badge: "Beginner Friendly",
  },
  {
    name: "WazirX",
    desc: "P2P trading + direct INR deposits to buy ETH. Owned by Binance.",
    url: "https://wazirx.com/exchange/ETH-INR",
    color: "from-amber-500 to-amber-600",
    badge: "P2P Available",
  },
];

export default function FiatOnrampWidget({ trigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState("intl");

  return (
    <>
      <div onClick={() => setIsOpen(true)} style={{ display: "contents", cursor: "pointer" }}>
        {trigger ?? (
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-primary-800 border border-emerald-200 dark:border-primary-600 rounded-lg text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-primary-700 transition-colors shadow-sm">
            <FiCreditCard className="w-4 h-4" />
            Buy Crypto with Card
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white dark:bg-primary-800 rounded-2xl shadow-large w-full max-w-md border border-emerald-100 dark:border-primary-700 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-50 dark:border-primary-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-emerald flex items-center justify-center shadow-emerald-glow">
                  <FiCreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 dark:text-white">Buy ETH</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Convert fiat to Ethereum</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-primary-700 transition-colors">
                <FiX className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-emerald-50 dark:border-primary-700">
              <button
                onClick={() => setTab("intl")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-b-2 ${tab === "intl"
                    ? "border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-primary-700"
                  }`}
              >
                <FiGlobe className="w-4 h-4" />
                International Card
              </button>
              <button
                onClick={() => setTab("india")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-b-2 ${tab === "india"
                    ? "border-orange-500 text-orange-700 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-900/10"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-primary-700"
                  }`}
              >
                <FiMapPin className="w-4 h-4" />
                India (INR)
              </button>
            </div>

            {/* International tab — MoonPay */}
            {tab === "intl" && (
              <>
                <div className="px-6 py-3 bg-emerald-50 dark:bg-primary-900/50 flex items-center gap-3">
                  {["Visa", "Mastercard", "Apple Pay"].map(p => (
                    <span key={p} className="text-xs font-semibold bg-white dark:bg-primary-800 text-slate-600 dark:text-slate-300 border border-emerald-100 dark:border-primary-700 px-2.5 py-1 rounded-md">
                      {p}
                    </span>
                  ))}
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">USD · EUR · GBP</span>
                </div>

                <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex items-start gap-2">
                  <FiAlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <span className="font-semibold">Demo mode:</span> MoonPay sandbox. No real transactions. Production requires API key.
                  </p>
                </div>

                <div style={{ height: 380 }}>
                  <iframe
                    src={MOONPAY_SANDBOX_URL}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; camera; gyroscope; payment"
                    frameBorder="0"
                    title="MoonPay ETH Purchase"
                  />
                </div>

                <div className="px-6 py-4 border-t border-emerald-50 dark:border-primary-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    <FiShield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>256-bit SSL · PCI-DSS compliant</span>
                  </div>
                  <a href="https://www.moonpay.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                    moonpay.com <FiExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </>
            )}

            {/* India tab — CoinDCX / CoinSwitch / WazirX */}
            {tab === "india" && (
              <div className="p-5 space-y-3">
                <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl p-3 mb-1">
                  <FiAlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                    RBI restricts direct INR crypto ramps on international platforms. Use these SEBI/FIU-IND registered Indian exchanges to buy ETH with UPI or bank transfer, then send to your EthosFund wallet.
                  </p>
                </div>

                {INDIAN_EXCHANGES.map((ex) => (
                  <a
                    key={ex.name}
                    href={ex.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-primary-900/50 hover:bg-emerald-50 dark:hover:bg-primary-700/50 border border-slate-100 dark:border-primary-700 hover:border-emerald-200 dark:hover:border-emerald-800 rounded-xl transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ex.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {ex.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-display font-bold text-slate-900 dark:text-white text-sm">{ex.name}</span>
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">{ex.badge}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ex.desc}</p>
                    </div>
                    <FiExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 flex-shrink-0 mt-0.5 transition-colors" />
                  </a>
                ))}

                <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-1">
                  After purchase, send ETH to your MetaMask wallet to contribute on EthosFund.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
