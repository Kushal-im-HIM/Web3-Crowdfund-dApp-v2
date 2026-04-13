/**
 * components/Layout/Header.js
 *
 * UPGRADE v2 — Emerald Forest light mode:
 *   Light mode header: white with emerald-100 bottom border (ef-header class).
 *   Search input: white bg, emerald-200 border, emerald focus ring.
 *   All dark: classes unchanged.
 *   Space Grotesk brand font retained.
 */

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { FiMenu, FiSun, FiMoon, FiBell, FiSearch } from "react-icons/fi";
import { useNetworkContracts } from "../../hooks/useNetworkContracts";

export default function Header({ onMenuToggle, isCollapsed }) {
  const [isDark, setIsDark] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { address, isConnected } = useAccount();
  const { name: networkName, isLocalhost, isSupported } = useNetworkContracts();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  const badgeClass = !isSupported
    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    : isLocalhost
      ? "bg-amber-100 text-amber-700 dark:bg-accent-900/30 dark:text-accent-400"
      : "bg-emerald-100 text-emerald-700 dark:bg-tertiary-900/30 dark:text-tertiary-400";

  const dotClass = !isSupported ? "bg-red-500" : isLocalhost ? "bg-amber-500" : "bg-emerald-500";

  return (
    <header className="ef-header sticky top-0 z-30 dark:bg-primary-900 border-b dark:border-primary-700 transition-all duration-300">
      <div className="flex items-center justify-between px-4 py-3">

        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-primary-800 transition-colors"
          >
            <FiMenu className="w-5 h-5 text-emerald-700 dark:text-gray-400" />
          </button>

          <div className="hidden sm:flex items-center relative">
            <FiSearch className="absolute left-3 w-4 h-4 text-emerald-400 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-emerald-50 dark:bg-primary-800 border border-emerald-200 dark:border-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500 text-slate-900 dark:text-white placeholder-emerald-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-primary-800 transition-colors"
          >
            {isDark
              ? <FiSun className="w-5 h-5 text-yellow-500" />
              : <FiMoon className="w-5 h-5 text-emerald-700" />}
          </button>

          {isConnected && (
            <button className="relative p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-primary-800 transition-colors">
              <FiBell className="w-5 h-5 text-emerald-700 dark:text-gray-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            </button>
          )}

          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotClass}`} />
            {networkName}
          </div>

          <ConnectButton
            chainStatus="icon"
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            showBalance={{ smallScreen: false, largeScreen: true }}
          />
        </div>
      </div>
    </header>
  );
}
