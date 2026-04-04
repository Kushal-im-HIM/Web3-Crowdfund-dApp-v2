/**
 * components/Layout/Header.js
 *
 * NETWORK SYNC FIX (unchanged):
 *   Live network badge via useNetworkContracts() — updates on MetaMask chain switch.
 *
 * MANDATE 5 — Light Mode Cream Aesthetic:
 *   - Header background: bg-[#fdfaf6] in light mode (warm cream) instead of stark white.
 *   - Bottom border: border-stone-200 (warm sand) instead of border-gray-200.
 *   - Search input background: bg-[#f7f3ed] (cream-200) instead of bg-gray-50.
 *   - Search input border: border-stone-200 instead of border-gray-200.
 *   - Hover states: hover:bg-stone-100 instead of hover:bg-gray-100.
 *   - All dark: classes are completely unchanged.
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

  // NETWORK SYNC FIX: live network info — updates when MetaMask chain changes
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

  // Network badge colours
  const badgeClass = !isSupported
    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    : isLocalhost
      ? "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400"
      : "bg-tertiary-100 text-tertiary-700 dark:bg-tertiary-900/30 dark:text-tertiary-400";

  const dotClass = !isSupported
    ? "bg-red-500"
    : isLocalhost
      ? "bg-accent-500"
      : "bg-tertiary-500";

  return (
    /* MANDATE 5: cream bg + warm sand border in light mode */
    <header className="sticky top-0 z-30 bg-[#fdfaf6] dark:bg-primary-900 border-b border-stone-200 dark:border-primary-700 transition-all duration-300">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            /* MANDATE 5: warm stone hover */
            className="md:hidden p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-primary-800 transition-colors"
          >
            <FiMenu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="hidden sm:flex items-center relative">
            <FiSearch className="absolute left-3 w-4 h-4 text-gray-400" />
            {/* MANDATE 5: cream input background */}
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-[#f7f3ed] dark:bg-primary-800 border border-stone-200 dark:border-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-primary-800 transition-colors"
          >
            {isDark ? (
              <FiSun className="w-5 h-5 text-yellow-500" />
            ) : (
              <FiMoon className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {isConnected && (
            <button className="relative p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-primary-800 transition-colors">
              <FiBell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            </button>
          )}

          {/* NETWORK SYNC FIX: live network badge */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotClass}`} />
            {networkName}
          </div>

          <ConnectButton
            chainStatus="icon"
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "full",
            }}
            showBalance={{
              smallScreen: false,
              largeScreen: true,
            }}
          />
        </div>
      </div>
    </header>
  );
}
