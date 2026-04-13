/**
 * components/FiatOnrampWidget.js
 *
 * MoonPay fiat-to-crypto onramp widget.
 * Opens MoonPay's sandbox environment in a modal overlay.
 * No API key required for the sandbox/demo.
 * Production would require a MoonPay publishable API key.
 *
 * For credit card → ETH conversion to support campaigns.
 * Purely additive — no existing code touched.
 *
 * Note: UPI/INR excluded per Indian payment gateway restrictions.
 * Supported: Visa, Mastercard, Apple Pay, Google Pay (USD/EUR/GBP).
 */

import { useState } from "react";
import { FiX, FiCreditCard, FiShield, FiExternalLink, FiAlertCircle } from "react-icons/fi";

// MoonPay sandbox URL — no API key needed for demo
const MOONPAY_SANDBOX_URL =
  "https://buy-sandbox.moonpay.com/?apiKey=pk_test_123&currencyCode=eth&colorCode=%2310b981&theme=light";

export default function FiatOnrampWidget({ trigger }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger — renders whatever the parent passes, or a default button */}
      <div onClick={() => setIsOpen(true)} style={{ display: "contents", cursor: "pointer" }}>
        {trigger ?? (
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-primary-800 border border-emerald-200 dark:border-primary-600 rounded-lg text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-primary-700 transition-colors shadow-sm">
            <FiCreditCard className="w-4 h-4" />
            Buy Crypto with Card
          </button>
        )}
      </div>

      {/* Modal overlay */}
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
                  <h3 className="font-display font-bold text-slate-900 dark:text-white">Buy ETH with Card</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Powered by MoonPay</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-primary-700 transition-colors"
              >
                <FiX className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Trust badges */}
            <div className="px-6 py-3 bg-emerald-50 dark:bg-primary-900/50 flex items-center gap-4">
              {["Visa", "Mastercard", "Apple Pay", "Google Pay"].map(p => (
                <span key={p} className="text-xs font-semibold bg-white dark:bg-primary-800 text-slate-600 dark:text-slate-300 border border-emerald-100 dark:border-primary-700 px-2.5 py-1 rounded-md">
                  {p}
                </span>
              ))}
            </div>

            {/* Sandbox notice */}
            <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex items-start gap-2">
              <FiAlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <span className="font-semibold">Demo mode:</span> This is MoonPay&apos;s sandbox environment. No real transactions. Production requires API key.
              </p>
            </div>

            {/* MoonPay iframe embed */}
            <div className="relative" style={{ height: 420 }}>
              <iframe
                src={MOONPAY_SANDBOX_URL}
                className="w-full h-full"
                allow="accelerometer; autoplay; camera; gyroscope; payment"
                frameBorder="0"
                title="MoonPay ETH Purchase"
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-emerald-50 dark:border-primary-700 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <FiShield className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-bit SSL encrypted · PCI-DSS compliant</span>
              </div>
              <a
                href="https://www.moonpay.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
              >
                moonpay.com <FiExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
