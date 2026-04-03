/**
 * components/Layout/Header.js
 *
 * NETWORK SYNC FIX:
 *   Previously read `ACTIVE_NETWORK` from constants — a static value frozen at
 *   boot time from NEXT_PUBLIC_NETWORK. The network badge therefore never updated
 *   when the user switched chains in MetaMask.
 *
 *   Fix: replaced with useNetworkContracts() which reads the live chain.id from
 *   wagmi's useNetwork(). The badge now reflects MetaMask's actual connected
 *   network in real time, including the correct name and colour.
 *
 *   The theme toggle logic is completely unchanged.
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

  // Badge colour: amber for localhost, cyan for Sepolia, red for unsupported
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
    <header className="sticky top-0 z-30 bg-white dark:bg-primary-900 border-b border-gray-200 dark:border-primary-700 transition-all duration-300">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-primary-800 transition-colors"
          >
            <FiMenu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="hidden sm:flex items-center relative">
            <FiSearch className="absolute left-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-gray-50 dark:bg-primary-800 border border-gray-200 dark:border-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-primary-800 transition-colors"
          >
            {isDark ? (
              <FiSun className="w-5 h-5 text-yellow-500" />
            ) : (
              <FiMoon className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {isConnected && (
            <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-primary-800 transition-colors">
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