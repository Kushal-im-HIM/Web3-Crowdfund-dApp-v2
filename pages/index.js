/**
 * pages/index.js
 *
 * MANDATE 5 — Global Theme Sync & Light Mode Overhaul:
 *   - Theme toggle (sun/moon) injected into the landing page Navbar alongside
 *     the ConnectButton. Reads/writes the same localStorage "theme" key and
 *     document.documentElement.classList used by Header.js, ensuring the toggle
 *     is perfectly in sync across all pages.
 *   - Landing page Footer refactored: dark classes removed, replaced with
 *     theme-aware Tailwind classes (bg-stone-100 dark:bg-primary-900, etc.)
 *     so the footer respects the user's light/dark preference.
 *   - Hero section, stats bar, and feature sections updated with softer cream/
 *     beige backgrounds in light mode (bg-amber-50, bg-stone-50, etc.) instead
 *     of stark white to match the Mandate 5 aesthetic overhaul.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  FiArrowRight,
  FiTarget,
  FiUsers,
  FiShield,
  FiGlobe,
  FiCheckCircle,
  FiZap,
  FiLock,
  FiTrendingUp,
  FiCode,
  FiGift,
  FiBook,
  FiSun,
  FiMoon,
} from "react-icons/fi";

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();

  // ── Theme toggle state — mirrors Header.js logic exactly ─────────────────
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved === "dark" || (!saved && prefersDark);
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // ── Data ─────────────────────────────────────────────────────────────────

  const features = [
    {
      icon: FiTarget,
      title: "Milestone-Based Releases",
      description:
        "Funds released only when project milestones are verified and approved by the community.",
      color: "emerald",
    },
    {
      icon: FiLock,
      title: "Smart Contract Escrow",
      description:
        "Your contributions are held securely in audited smart contracts until goals are met.",
      color: "slate",
    },
    {
      icon: FiShield,
      title: "Automatic Refunds",
      description:
        "Failed campaigns trigger instant automatic refunds to all contributors—no manual claims.",
      color: "cyan",
    },
    {
      icon: FiGlobe,
      title: "Zero Platform Fees",
      description:
        "0% platform fees on all campaigns. A tiny anti-spam deposit keeps bots out — that's it.",
      color: "amber",
    },
  ];

  const useCases = [
    { icon: FiBook, title: "Student Research", description: "Fund academic projects and capstone innovations", color: "emerald" },
    { icon: FiCode, title: "Dev Tooling", description: "Support Web3 infrastructure and open-source tools", color: "cyan" },
    { icon: FiUsers, title: "Indie Games", description: "Back creative game development projects", color: "amber" },
    { icon: FiGift, title: "NFT & Digital Art", description: "Support digital creators and artists", color: "emerald" },
    { icon: FiTrendingUp, title: "Public Goods", description: "Fund decentralized community projects", color: "cyan" },
  ];

  const stats = [
    { value: "0%", label: "Platform Fee", icon: FiCheckCircle, color: "emerald" },
    { value: "100%", label: "On-Chain Transparency", icon: FiShield, color: "cyan" },
    { value: "Instant", label: "Crypto Disbursement", icon: FiZap, color: "amber" },
  ];

  return (
    // MANDATE 5: Cream beige background in light mode
    <div className="min-h-screen bg-amber-50 dark:bg-primary-900 transition-colors duration-300">

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      {/* MANDATE 5: warm cream/white header in light mode */}
      <header className="bg-amber-50/95 dark:bg-primary-800/80 border-b border-amber-200 dark:border-primary-700 sticky top-0 z-50 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-emerald rounded-xl flex items-center justify-center shadow-emerald-glow">
                <span className="text-white font-bold text-lg">EF</span>
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  EthosFund
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Decentralised Funding</p>
              </div>
            </div>

            {/* Right: theme toggle + connect */}
            <div className="flex items-center gap-3">
              {/* MANDATE 5: Theme toggle injected into landing page Navbar */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-stone-100 dark:bg-primary-700 hover:bg-stone-200 dark:hover:bg-primary-600 transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <FiSun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <FiMoon className="w-5 h-5 text-gray-600" />
                )}
              </button>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      {/* MANDATE 5: soft gradient hero, not blinding white */}
      <section className="relative overflow-hidden bg-gradient-slate-emerald dark:bg-gradient-slate-emerald-dark py-20 sm:py-28 transition-colors duration-300">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary-200 dark:bg-secondary-900 rounded-full opacity-20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-200 dark:bg-accent-900 rounded-full opacity-20 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-white/80 dark:bg-primary-800 px-4 py-2 rounded-full shadow-soft mb-6 border border-amber-200 dark:border-primary-700 backdrop-blur-sm">
              <FiShield className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Smart Contract Verified Platform
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Transparent Funding for
              <span className="block mt-2 bg-gradient-emerald bg-clip-text text-transparent">
                Decentralised Funding
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Launch milestone-based campaigns with zero platform fees. Every contribution protected by smart contracts, every release verified on-chain.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isConnected ? (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="group bg-gradient-emerald text-white px-8 py-4 rounded-xl font-semibold hover:shadow-emerald-glow transition-all duration-300 inline-flex items-center text-lg transform hover:-translate-y-0.5"
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
                        className="text-secondary-600 dark:text-secondary-400 font-semibold text-lg inline-flex items-center"
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
                className="bg-white/80 dark:bg-primary-800 text-gray-900 dark:text-white px-8 py-4 rounded-xl font-semibold border-2 border-amber-300 dark:border-primary-600 hover:border-secondary-500 dark:hover:border-secondary-500 transition-all duration-300 text-lg backdrop-blur-sm"
              >
                Explore Campaigns
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      {/* MANDATE 5: warm ivory bar in light mode */}
      <section className="bg-amber-50 dark:bg-primary-800 border-t border-b border-amber-200 dark:border-primary-700 py-8 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const colorClasses = {
                emerald: "text-secondary-600 dark:text-secondary-400 bg-secondary-50 dark:bg-secondary-900/20",
                cyan: "text-tertiary-600 dark:text-tertiary-400 bg-tertiary-50 dark:bg-tertiary-900/20",
                amber: "text-accent-600 dark:text-accent-400 bg-amber-100 dark:bg-accent-900/20",
              };
              return (
                <div key={index} className="flex flex-col items-center">
                  <div className={`inline-flex items-center space-x-3 ${colorClasses[stat.color]} px-6 py-3 rounded-full mb-2`}>
                    <Icon className="w-6 h-6" />
                    <span className="text-3xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── USE CASES ────────────────────────────────────────────────────── */}
      {/* MANDATE 5: cream white section */}
      <section className="py-20 bg-white/70 dark:bg-primary-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What Can You Fund?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              From student research to indie games, support Web3 innovation across all categories
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              const colorClasses = {
                emerald: "group-hover:bg-secondary-50 dark:group-hover:bg-secondary-900/20 group-hover:text-secondary-600 dark:group-hover:text-secondary-400",
                cyan: "group-hover:bg-tertiary-50 dark:group-hover:bg-tertiary-900/20 group-hover:text-tertiary-600 dark:group-hover:text-tertiary-400",
                amber: "group-hover:bg-amber-50 dark:group-hover:bg-accent-900/20 group-hover:text-accent-600 dark:group-hover:text-accent-400",
              };
              return (
                <div key={index} className="group text-center cursor-pointer">
                  <div className={`w-20 h-20 mx-auto bg-stone-100 dark:bg-primary-800 rounded-2xl flex items-center justify-center transition-all duration-300 ${colorClasses[useCase.color]}`}>
                    <Icon className="w-10 h-10 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                    {useCase.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {useCase.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      {/* MANDATE 5: warm stone-50 background */}
      <section className="py-20 bg-stone-50 dark:bg-primary-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose EthosFund?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Built on Ethereum with cutting-edge smart contracts for maximum security and transparency
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const colorClasses = {
                emerald: "from-secondary-500 to-secondary-600 shadow-emerald-glow",
                slate: "from-primary-500 to-primary-600",
                cyan: "from-tertiary-500 to-tertiary-600",
                amber: "from-accent-500 to-accent-600 shadow-amber-glow",
              };
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-primary-900 p-8 rounded-2xl shadow-slate-soft hover:shadow-lg transition-all duration-300 border border-amber-100 dark:border-primary-700 hover:border-secondary-300 dark:hover:border-secondary-700 group"
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${colorClasses[feature.color]} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-white/70 dark:bg-primary-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Three simple steps to launch or support a campaign
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-emerald rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold shadow-emerald-glow">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Create Campaign
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Set your funding goal, milestones, and deadline. EthosFund takes 0% of your raised funds. A small anti-spam deposit is all that's required.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-tertiary-500 to-tertiary-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Community Funds
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Contributors back your project with crypto. Funds locked in smart contract escrow.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-amber rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold shadow-amber-glow">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Milestones Release
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Reach your goal, complete milestones, and withdraw funds. Or get auto-refunded if unsuccessful.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORM STATS ───────────────────────────────────────────────── */}
      <section className="py-20 bg-stone-50 dark:bg-primary-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold bg-gradient-emerald bg-clip-text text-transparent mb-2">
                1000+
              </div>
              <div className="text-gray-600 dark:text-gray-400 font-medium">
                Campaigns Launched
              </div>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-to-br from-tertiary-500 to-tertiary-600 bg-clip-text text-transparent mb-2">
                $2M+
              </div>
              <div className="text-gray-600 dark:text-gray-400 font-medium">
                Funds Raised
              </div>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-amber bg-clip-text text-transparent mb-2">
                50K+
              </div>
              <div className="text-gray-600 dark:text-gray-400 font-medium">
                Contributors
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      {/*
        MANDATE 5: Footer is now fully theme-aware.
        Light mode: warm stone/beige background, dark text/borders.
        Dark mode: original dark slate bg, light text — preserved exactly.
        No more hardcoded dark-only classes on bg/text.
      */}
      <footer className="bg-stone-100 dark:bg-primary-900 border-t border-stone-200 dark:border-primary-800 py-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-emerald rounded-xl flex items-center justify-center shadow-emerald-glow">
                <span className="text-white font-bold text-lg">EF</span>
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">EthosFund</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transparent Web3 Crowdfunding</p>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 text-center max-w-2xl">
              Transparent funding for Web3 innovation. Built on Ethereum with smart contract security.
            </p>

            <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <span>© 2025 EthosFund</span>
              <span>•</span>
              <span>Built on Ethereum</span>
              <span>•</span>
              <span>Open Source</span>
            </div>

            <div className="flex items-center space-x-2 text-xs text-gray-400 dark:text-gray-500">
              <FiShield className="w-4 h-4 text-secondary-500 dark:text-secondary-400" />
              <span>Smart Contracts Audited</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
