/**
 * pages/index.js — EthosFund Landing Page
 *
 * UI/UX UPGRADE — Complete redesign:
 *   - Headline fix: was "Transparent Funding for Decentralised Funding" (typo/nonsense)
 *     Now: "Fund Bold Ideas." / "No Middlemen. No Compromise."
 *   - Hero: CSS dot-grid background (Linear/Vercel style) + floating trust chips
 *   - Marquee: CSS-only infinite scrolling trust bar between hero and stats
 *   - Scroll reveal: IntersectionObserver fade-up on all sections
 *   - Animated counters: Platform stats count up on scroll-into-view
 *   - SVG connector arrows between "How It Works" steps
 *   - "Platform Deep Dive" section: rich feature cards for milestones,
 *     transparency dashboard, community voting, and zero-fee escrow
 *   - Interactive Guide modal: floating "?" button → 5-step walkthrough
 *   - Space Grotesk display font on all headings
 *   - Slate Emerald Harmony light mode throughout (no more amber/stone/cream)
 *   - Dark mode: animated mesh gradient hero
 *   - Theme toggle synced with rest of app
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import FiatOnrampWidget from "../components/FiatOnrampWidget";
import {
  FiArrowRight, FiTarget, FiUsers, FiShield, FiGlobe,
  FiCheckCircle, FiZap, FiLock, FiTrendingUp, FiCode,
  FiGift, FiBook, FiSun, FiMoon, FiX, FiChevronRight,
  FiChevronLeft, FiActivity, FiBarChart2, FiThumbsUp,
  FiDollarSign, FiEye, FiCpu, FiHelpCircle, FiSmartphone, FiMail
} from "react-icons/fi";

// ── Guide walkthrough steps ───────────────────────────────────────────────────
const GUIDE_STEPS = [
  {
    icon: FiLock,
    color: "emerald",
    title: "1. Connect Your Wallet",
    desc: "Use MetaMask, Coinbase Wallet, or any Web3 wallet via RainbowKit. No email, no signup — your wallet IS your account.",
    detail: "EthosFund uses RainbowKit for seamless wallet connection. Your wallet address is your identity. We never store personal data.",
  },
  {
    icon: FiTarget,
    color: "cyan",
    title: "2. Create or Browse Campaigns",
    desc: "Creators set a funding goal, a deadline, and a milestone plan. Backers browse active campaigns and contribute ETH directly.",
    detail: "Every campaign requires a minimum of 2 milestones before it can accept funds — protecting contributors from campaigns with no accountability plan.",
  },
  {
    icon: FiShield,
    color: "slate",
    title: "3. Funds Locked in Smart Contract Escrow",
    desc: "Contributions go directly into an audited smart contract — not held by EthosFund. If the goal isn't met, everyone gets refunded automatically.",
    detail: "Zero platform custody. The smart contract is the escrow agent. EthosFund has no ability to touch contributor funds.",
  },
  {
    icon: FiThumbsUp,
    color: "amber",
    title: "4. Milestones & Community Voting",
    desc: "When a milestone is reached, the creator submits proof. The community votes to approve or reject. Only the approved milestone share is released.",
    detail: "Voting power is proportional to contribution amount. A milestone must pass a quorum threshold before funds are released — true community governance.",
  },
  {
    icon: FiEye,
    color: "emerald",
    title: "5. Full Transparency, Always",
    desc: "Every ETH movement, vote count, and milestone status is visible on the Transparency Dashboard. Nothing is hidden — all verifiable on Ethereum.",
    detail: "The Transparency Dashboard shows live on-chain data: total raised, funds released per milestone, contributor list, and audit trail for every action.",
  },
];

// ── Feature deep-dive data ───────────────────────────────────────────────────
const DEEP_FEATURES = [
  {
    icon: FiActivity,
    color: "emerald",
    badge: "Core Mechanic",
    title: "Milestone-Gated Releases",
    desc: "Funds don't go to creators all at once. Each milestone unlocks only its share. Backers stay protected throughout the entire campaign lifecycle.",
    visual: "milestone",
  },
  {
    icon: FiEye,
    color: "cyan",
    badge: "On-Chain Data",
    title: "Transparency Dashboard",
    desc: "A real-time audit trail of every ETH movement, vote, and milestone status — verifiable directly on Ethereum. Nothing is hidden.",
    visual: "dashboard",
  },
  {
    icon: FiThumbsUp,
    color: "amber",
    badge: "Governance",
    title: "Community Voting",
    desc: "Contributors vote on milestone approvals proportional to their contribution. No centralized authority decides — the community governs.",
    visual: "voting",
  },
  {
    icon: FiZap,
    color: "slate",
    badge: "Zero Overhead",
    title: "0% Fees + Auto Refunds",
    desc: "No platform cut. A tiny anti-spam deposit (returned on success) is all it takes. Failed campaigns trigger instant automatic refunds to all contributors.",
    visual: "fees",
  },
];

const colorMap = {
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: "from-emerald-500 to-emerald-600",
  },
  cyan: {
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    text: "text-cyan-600 dark:text-cyan-400",
    badge: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800",
    icon: "from-cyan-500 to-cyan-600",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    icon: "from-amber-500 to-amber-600",
  },
  slate: {
    bg: "bg-slate-50 dark:bg-slate-900/20",
    text: "text-slate-600 dark:text-slate-400",
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    icon: "from-slate-500 to-slate-600",
  },
};

// ── Deep Feature Visual mini-components ──────────────────────────────────────
function MilestoneVisual() {
  const steps = ["Funded ✓", "M1 Approved ✓", "M2 Pending", "M3 Pending"];
  return (
    <div className="mt-5 space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < 2 ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
            }`}>
            {i < 2 ? "✓" : i + 1}
          </div>
          <div className={`text-xs font-medium ${i < 2 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
            {s}
          </div>
          {i < 2 && (
            <div className="flex-1 h-1 rounded bg-emerald-200 dark:bg-emerald-900/40">
              <div className={`h-1 rounded bg-emerald-500 ${i === 0 ? "w-full" : "w-3/4"}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DashboardVisual() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2">
      {[
        { label: "ETH Raised", val: "12.4 ETH", up: true },
        { label: "Votes Cast", val: "284", up: true },
        { label: "Released", val: "4.1 ETH", up: null },
        { label: "Campaigns", val: "23", up: null },
      ].map((d, i) => (
        <div key={i} className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5 border border-slate-100 dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400">{d.label}</div>
          <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5 font-display">{d.val}</div>
        </div>
      ))}
    </div>
  );
}

function VotingVisual() {
  return (
    <div className="mt-5 space-y-3">
      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Milestone 2 — Approval Vote</div>
      <div>
        <div className="flex justify-between text-xs font-semibold mb-1">
          <span className="text-emerald-600 dark:text-emerald-400">YES — 73%</span>
          <span className="text-red-500">NO — 27%</span>
        </div>
        <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: "73%" }} />
        </div>
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500">284 of 390 contributors voted · Quorum met ✓</div>
    </div>
  );
}

function FeesVisual() {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400">Contributor</div>
          <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mt-0.5 font-display">1.0 ETH</div>
        </div>
        <FiArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-2 text-center border border-emerald-200 dark:border-emerald-800">
          <div className="text-xs text-emerald-600 dark:text-emerald-400">Contract</div>
          <div className="text-emerald-700 dark:text-emerald-300 font-bold text-sm mt-0.5 font-display">1.0 ETH</div>
        </div>
        <FiArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400">Creator</div>
          <div className="text-slate-900 dark:text-white font-bold text-sm mt-0.5 font-display">1.0 ETH</div>
        </div>
      </div>
      <div className="text-xs text-center text-slate-400 dark:text-slate-500 font-medium">Platform fee: 0%</div>
    </div>
  );
}

const VISUALS = { milestone: MilestoneVisual, dashboard: DashboardVisual, voting: VotingVisual, fees: FeesVisual };

// ── Guide Modal ───────────────────────────────────────────────────────────────
function GuideModal({ onClose }) {
  const [step, setStep] = useState(0);
  const current = GUIDE_STEPS[step];
  const Icon = current.icon;
  const c = colorMap[current.color];

  const handleKey = useCallback((e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight" && step < GUIDE_STEPS.length - 1) setStep(s => s + 1);
    if (e.key === "ArrowLeft" && step > 0) setStep(s => s - 1);
  }, [step, onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-primary-800 rounded-2xl shadow-large w-full max-w-lg border border-slate-200 dark:border-primary-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-primary-700">
          <div>
            <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
              How EthosFund Works
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Step {step + 1} of {GUIDE_STEPS.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-primary-700 transition-colors"
          >
            <FiX className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Step progress dots */}
        <div className="flex gap-1.5 px-6 pt-4">
          {GUIDE_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "bg-secondary-500 w-6" : "bg-slate-200 dark:bg-primary-700 w-3"
                }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 step-animate" key={step}>
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.icon} flex items-center justify-center mb-5 shadow-emerald-glow`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <h4 className="font-display font-bold text-slate-900 dark:text-white text-xl mb-3">
            {current.title}
          </h4>
          <p className="text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
            {current.desc}
          </p>
          <div className={`${c.bg} ${c.border} border rounded-xl p-4`}>
            <p className={`text-sm ${c.text} leading-relaxed`}>{current.detail}</p>
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-primary-700">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-colors"
          >
            <FiChevronLeft className="w-4 h-4" /> Previous
          </button>
          {step === GUIDE_STEPS.length - 1 ? (
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-gradient-emerald text-white px-5 py-2 rounded-lg text-sm font-semibold hover:shadow-emerald-glow transition-all"
            >
              Got it! <FiCheckCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setStep(s => Math.min(GUIDE_STEPS.length - 1, s + 1))}
              className="flex items-center gap-1.5 text-sm font-semibold text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 transition-colors"
            >
              Next <FiChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [isDark, setIsDark] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const statsRef = useRef(null);
  const countersStarted = useRef(false);

  // ── Theme toggle — mirrors Header.js exactly ──────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved === "dark" || (!saved && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // ── Scroll reveal ─────────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-visible"); observer.unobserve(e.target); } }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ── Animated counters ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!statsRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !countersStarted.current) {
        countersStarted.current = true;
        document.querySelectorAll("[data-counter]").forEach(el => {
          const target = parseInt(el.dataset.counter, 10);
          const display = el.dataset.display || "";
          const duration = 1800;
          const start = performance.now();
          const tick = (now) => {
            const elapsed = now - start;
            const p = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.floor(eased * target).toLocaleString() + (p < 1 ? "" : display);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      }
    }, { threshold: 0.5 });
    obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Marquee items ─────────────────────────────────────────────────────────
  const marqueeItems = [
    "⬡ Zero Platform Fees",
    "⬡ Milestone-Gated Releases",
    "⬡ Smart Contract Escrow",
    "⬡ Community Governance",
    "⬡ Automatic Refunds",
    "⬡ On-Chain Transparency",
    "⬡ Ethereum-Native",
    "⬡ Audited Contracts",
    "⬡ No Middlemen",
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-primary-900 transition-colors duration-300">

      {/* ── GUIDE MODAL ──────────────────────────────────────────────────── */}
      {isGuideOpen && <GuideModal onClose={() => setIsGuideOpen(false)} />}

      {/* ── FLOATING GUIDE BUTTON ─────────────────────────────────────────── */}
      <button
        onClick={() => setIsGuideOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-emerald rounded-full flex items-center justify-center shadow-emerald-glow hover:scale-110 transition-transform duration-200 group"
        title="How EthosFund works"
      >
        <FiHelpCircle className="w-6 h-6 text-white" />
      </button>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className="bg-slate-50/95 dark:bg-primary-800/80 border-b border-slate-200 dark:border-primary-700 sticky top-0 z-50 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-emerald-glow">
                <img src="/favicon.svg" alt="EthosFund" className="w-full h-full" />
              </div>
              <div>
                <span className="text-xl font-bold text-slate-900 dark:text-white font-display">EthosFund</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">Decentralised Funding</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsGuideOpen(true)}
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-secondary-600 dark:hover:text-secondary-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-primary-700"
              >
                <FiHelpCircle className="w-4 h-4" />
                How it works
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-slate-100 dark:bg-primary-700 hover:bg-slate-200 dark:hover:bg-primary-600 transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <FiSun className="w-5 h-5 text-yellow-500" /> : <FiMoon className="w-5 h-5 text-slate-600" />}
              </button>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-slate-emerald dark:bg-gradient-slate-emerald-dark py-24 sm:py-32 transition-colors duration-300">
        {/* CSS dot-grid background */}
        <div className="hero-dot-grid" />
        {/* Dark mode animated mesh */}
        <div className="absolute inset-0 dark-mesh-hero opacity-0 dark:opacity-100 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">

            {/* Trust badge */}
            <div className="reveal inline-flex items-center space-x-2 bg-white/90 dark:bg-primary-800 px-4 py-2 rounded-full shadow-soft mb-8 border border-slate-200 dark:border-primary-700 backdrop-blur-sm">
              <FiShield className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Smart Contract Verified · Audited
              </span>
            </div>

            {/* HEADLINE — fixed from the original cringe "Transparent Funding for Decentralised Funding" */}
            <h1 className="reveal reveal-delay-1 font-display text-5xl sm:text-6xl md:text-7xl font-bold text-slate-900 dark:text-white mb-6 leading-tight tracking-tight">
              Fund Bold Ideas.
              <span className="block mt-2 shimmer-gradient-text">
                No Middlemen.
              </span>
            </h1>

            <p className="reveal reveal-delay-2 text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Milestone-gated crowdfunding with zero platform fees, community governance, and automatic refunds — all enforced by smart contracts on Ethereum.
            </p>

            {/* Floating trust chips */}
            <div className="reveal reveal-delay-2 flex flex-wrap justify-center gap-2 mb-10">
              {["0% Platform Fee", "Auto Refunds", "Community Votes", "On-Chain Always"].map((chip, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 bg-white/80 dark:bg-primary-800/80 border border-slate-200 dark:border-primary-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                  <FiCheckCircle className="w-3.5 h-3.5 text-secondary-500" />
                  {chip}
                </span>
              ))}
            </div>

            <div className="reveal reveal-delay-3 flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isConnected ? (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="group bg-gradient-emerald text-white px-8 py-4 rounded-xl font-semibold hover:shadow-emerald-glow transition-all duration-300 inline-flex items-center text-lg transform hover:-translate-y-0.5 font-display"
                >
                  Go to Dashboard
                  <FiArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <div className="bg-white dark:bg-primary-800 border-2 border-secondary-500 px-8 py-4 rounded-xl shadow-soft">
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <button
                        onClick={openConnectModal}
                        className="text-secondary-600 dark:text-secondary-400 font-semibold text-lg inline-flex items-center font-display"
                      >
                        <FiLock className="w-5 h-5 mr-2" />
                        Connect Wallet to Start
                      </button>
                    )}
                  </ConnectButton.Custom>
                </div>
              )}
              <button
                onClick={() => router.push("/campaigns")}
                className="bg-white/80 dark:bg-primary-800 text-slate-900 dark:text-white px-8 py-4 rounded-xl font-semibold border-2 border-slate-200 dark:border-primary-600 hover:border-secondary-500 dark:hover:border-secondary-500 transition-all duration-300 text-lg backdrop-blur-sm font-display"
              >
                Explore Campaigns
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE TRUST BAR ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-primary-800 border-b border-slate-100 dark:border-primary-700 py-3">
        <div className="marquee-wrap">
          <div className="marquee-track">
            {/* Doubled for seamless infinite loop */}
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="mx-8 text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap flex-shrink-0">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS BAR — animated counters ────────────────────────────────── */}
      <section className="bg-slate-50 dark:bg-primary-800 border-b border-slate-100 dark:border-primary-700 py-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { icon: FiCheckCircle, color: "emerald", label: "Platform Fee", value: "0%", static: true },
              { icon: FiShield, color: "cyan", label: "On-Chain Transparency", value: "100%", static: true },
              { icon: FiZap, color: "amber", label: "Crypto Disbursement", value: "Instant", static: true },
            ].map((stat, i) => {
              const Icon = stat.icon;
              const c = colorMap[stat.color];
              return (
                <div key={i} className={`reveal reveal-delay-${i + 1} flex flex-col items-center`}>
                  <div className={`inline-flex items-center space-x-3 ${c.bg} ${c.text} px-6 py-3 rounded-full mb-2`}>
                    <Icon className="w-6 h-6" />
                    <span className="text-3xl font-bold font-display">{stat.value}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PLATFORM DEEP DIVE ───────────────────────────────────────────── */}
      <section className="py-24 bg-white dark:bg-primary-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <span className="inline-flex items-center gap-2 bg-secondary-50 dark:bg-secondary-900/20 text-secondary-700 dark:text-secondary-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 border border-secondary-200 dark:border-secondary-800">
              <FiCpu className="w-4 h-4" /> What Makes EthosFund Different
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              Built for accountability,<br className="hidden sm:block" /> not just fundraising.
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Every mechanism exists to protect contributors and hold creators accountable — without any centralized authority.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DEEP_FEATURES.map((f, i) => {
              const Icon = f.icon;
              const c = colorMap[f.color];
              const Visual = VISUALS[f.visual];
              return (
                <div key={i} className={`reveal reveal-delay-${i + 1} bg-slate-50 dark:bg-primary-800 rounded-2xl p-8 border border-slate-100 dark:border-primary-700 hover:border-slate-200 dark:hover:border-primary-600 transition-all duration-300 card-hover`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${c.icon} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>{f.badge}</span>
                      <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-2">{f.title}</h3>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                  <Visual />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — with SVG connectors ───────────────────────────── */}
      <section className="py-24 bg-slate-50 dark:bg-primary-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              Three Steps to Get Started
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Simple for everyone, powerful for every project.
            </p>
          </div>

          {/* Steps with SVG connector lines on desktop */}
          <div className="relative">
            {/* SVG connector arrows — desktop only */}
            <div className="hidden md:block absolute top-10 left-0 right-0 pointer-events-none" style={{ zIndex: 0 }}>
              <svg viewBox="0 0 900 20" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Line from step 1 to step 2 */}
                <line x1="185" y1="10" x2="380" y2="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" className="text-secondary-300 dark:text-secondary-700" />
                <polygon points="380,5 395,10 380,15" fill="currentColor" className="text-secondary-400 dark:text-secondary-600" />
                {/* Line from step 2 to step 3 */}
                <line x1="520" y1="10" x2="715" y2="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" className="text-secondary-300 dark:text-secondary-700" />
                <polygon points="715,5 730,10 715,15" fill="currentColor" className="text-secondary-400 dark:text-secondary-600" />
              </svg>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative" style={{ zIndex: 1 }}>
              {[
                {
                  num: "1",
                  gradient: "bg-gradient-emerald shadow-emerald-glow",
                  title: "Create a Campaign",
                  body: "Set your ETH goal, deadline, and milestone plan. EthosFund takes 0% of your raised funds. A small anti-spam deposit (fully refunded on success) is all you need.",
                },
                {
                  num: "2",
                  gradient: "bg-gradient-to-br from-tertiary-500 to-tertiary-600",
                  title: "Community Backs It",
                  body: "Contributors back your project with ETH. Funds lock in smart contract escrow. If the goal is missed, everyone gets a full automatic refund — no manual action needed.",
                },
                {
                  num: "3",
                  gradient: "bg-gradient-amber shadow-amber-glow",
                  title: "Milestones Unlock Funds",
                  body: "Complete each milestone, submit proof, and the community votes. Approved milestones release their share. The cycle continues until the project is complete.",
                },
              ].map((step, i) => (
                <div key={i} className={`reveal reveal-delay-${i + 1} text-center`}>
                  <div className={`w-20 h-20 ${step.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 text-white text-3xl font-bold font-display`}>
                    {step.num}
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-3">{step.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA after steps */}
          <div className="text-center mt-12 reveal">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="inline-flex items-center gap-2 text-secondary-600 dark:text-secondary-400 font-semibold hover:gap-3 transition-all"
            >
              <FiHelpCircle className="w-5 h-5" />
              See the full interactive guide
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── USE CASES ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-primary-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              What Can You Fund?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              From student research to public goods — any project that deserves trustless backing.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { icon: FiBook, title: "Student Research", description: "Fund academic projects and capstone innovations", color: "emerald" },
              { icon: FiCode, title: "Dev Tooling", description: "Support Web3 infrastructure and open-source tools", color: "cyan" },
              { icon: FiUsers, title: "Indie Games", description: "Back creative game development projects", color: "amber" },
              { icon: FiGift, title: "NFT & Digital Art", description: "Support digital creators and artists", color: "emerald" },
              { icon: FiTrendingUp, title: "Public Goods", description: "Fund decentralized community projects", color: "cyan" },
            ].map((useCase, i) => {
              const Icon = useCase.icon;
              const c = colorMap[useCase.color];
              return (
                <div key={i} className={`reveal reveal-delay-${i + 1} group text-center cursor-pointer`}>
                  <div className={`w-20 h-20 mx-auto bg-slate-50 dark:bg-primary-800 border border-slate-100 dark:border-primary-700 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:${c.bg} group-hover:border-transparent`}>
                    <Icon className={`w-10 h-10 text-slate-500 dark:text-slate-400 group-hover:${c.text} group-hover:scale-110 transition-all`} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold font-display text-slate-900 dark:text-white">{useCase.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{useCase.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PLATFORM STATS — animated counters ───────────────────────────── */}
      <section ref={statsRef} className="py-20 bg-slate-50 dark:bg-primary-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="reveal">
              <div className="text-5xl md:text-6xl font-bold font-display shimmer-gradient-text mb-2">
                <span data-counter="1000" data-display="+">0</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-medium">Campaigns Launched</div>
            </div>
            <div className="reveal reveal-delay-1">
              <div className="font-display text-5xl md:text-6xl font-bold bg-gradient-to-br from-tertiary-500 to-tertiary-600 bg-clip-text text-transparent mb-2">
                $<span data-counter="2" data-display="M+">0</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-medium">Funds Raised</div>
            </div>
            <div className="reveal reveal-delay-2">
              <div className="font-display text-5xl md:text-6xl font-bold bg-gradient-amber bg-clip-text text-transparent mb-2">
                <span data-counter="50000" data-display="+">0</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-medium">Contributors</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white dark:bg-primary-900 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="reveal bg-gradient-slate-emerald dark:bg-gradient-slate-emerald-dark rounded-3xl p-12 relative overflow-hidden border border-slate-100 dark:border-primary-700">
            <div className="hero-dot-grid opacity-50" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-6 shadow-emerald-glow"><img src="/favicon.svg" alt="EthosFund" className="w-full h-full" /></div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                Ready to fund something bold?
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-xl mx-auto">
                Join EthosFund — where every contribution is protected, every milestone is accountable, and every ETH goes where it's supposed to.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push("/create-campaign")}
                  className="group bg-gradient-emerald text-white px-8 py-4 rounded-xl font-semibold hover:shadow-emerald-glow transition-all duration-300 inline-flex items-center justify-center text-lg transform hover:-translate-y-0.5 font-display"
                >
                  Launch a Campaign
                  <FiArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => router.push("/campaigns")}
                  className="bg-white/80 dark:bg-primary-800 text-slate-900 dark:text-white px-8 py-4 rounded-xl font-semibold border-2 border-slate-200 dark:border-primary-600 hover:border-secondary-500 dark:hover:border-secondary-500 transition-all text-lg font-display"
                >
                  Browse Campaigns
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WEB3 ONBOARDING + ONRAMP SECTION ─────────────────────────────── */}
      <section className="py-20 bg-slate-50 dark:bg-primary-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              Lower the barrier to entry
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              No wallet? No problem. We're building paths so anyone can participate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* MoonPay Onramp */}
            <div className="reveal bg-white dark:bg-primary-800 rounded-2xl p-7 border border-emerald-100 dark:border-primary-700 shadow-sm card-hover">
              <div className="w-12 h-12 bg-gradient-emerald rounded-xl flex items-center justify-center mb-4 shadow-emerald-glow">
                <FiSmartphone className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full">Live Demo</span>
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg mt-3 mb-2">
                Fiat-to-Crypto Onramp
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-5">
                Donate with a credit card — Visa, Mastercard, Apple Pay, or Google Pay. MoonPay converts it to ETH instantly behind the scenes. No wallet setup required to contribute.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <FiatOnrampWidget />
                <span className="text-xs text-slate-400">Powered by MoonPay · No UPI (India restriction)</span>
              </div>
            </div>

            {/* Account Abstraction — Coming Soon */}
            <div className="reveal reveal-delay-1 bg-white dark:bg-primary-800 rounded-2xl p-7 border border-slate-100 dark:border-primary-700 shadow-sm relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                Coming Soon
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <FiShield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-full">ERC-4337</span>
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg mt-3 mb-2">
                Social Login Wallets
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                Sign in with Gmail or X (Twitter) — no seed phrase, no extension. Account abstraction (ERC-4337) creates a smart contract wallet behind the scenes, invisible to the user.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Gmail", "X / Twitter", "Smart Contract Wallet", "No Seed Phrase"].map(tag => (
                  <span key={tag} className="text-xs bg-slate-100 dark:bg-primary-700 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-slate-50 dark:bg-primary-900 border-t border-slate-200 dark:border-primary-800 py-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-emerald-glow">
                <img src="/favicon.svg" alt="EthosFund" className="w-full h-full" />
              </div>
              <div>
                <span className="text-xl font-bold font-display text-slate-900 dark:text-white">EthosFund</span>
                <p className="text-sm text-slate-500 dark:text-slate-400">Transparent Web3 Crowdfunding</p>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-2xl text-sm">
              Trustless crowdfunding for Web3 innovation. Built on Ethereum with audited smart contracts and community governance.
            </p>
            <div className="flex items-center space-x-6 text-sm text-slate-500 dark:text-slate-400">
              <span>© 2025 EthosFund</span>
              <span>·</span>
              <span>Built on Ethereum</span>
              <span>·</span>
              <span>Open Source</span>
            </div>
            <a
              href="mailto:kushalpothumanchi@gmail.com"
              className="flex items-center gap-2 text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors font-medium"
            >
              <FiMail className="w-4 h-4" />
              Contact us · kushalpothumanchi@gmail.com
            </a>
            <div className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500">
              <FiShield className="w-4 h-4 text-secondary-500 dark:text-secondary-400" />
              <span>Smart Contracts Audited · Zero Custody Risk</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
