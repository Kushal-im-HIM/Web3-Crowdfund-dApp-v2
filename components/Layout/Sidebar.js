/**
 * components/Layout/Sidebar.js
 *
 * UPGRADE v2 — "Emerald Forest" sidebar:
 *
 * LIGHT MODE (new):
 *   Deep emerald-900 sidebar (#064e3b gradient → #065f46) with white/emerald-tinted text.
 *   This mirrors the structure of dark mode (dark sidebar, light content) but in the
 *   "Emerald Forest" palette. The result: light mode now feels as premium as dark mode.
 *   Custom CSS classes ef-sidebar-* from globals.css handle all light-mode specifics.
 *
 * DARK MODE (unchanged):
 *   bg-primary-900 dark sidebar — exactly as before.
 *
 * SHARED:
 *   Pill active nav state (from previous upgrade) — retained.
 *   Space Grotesk brand name — retained.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import {
  FiHome, FiGrid, FiPlus, FiUser, FiHeart,
  FiSettings, FiX, FiChevronLeft, FiSearch,
} from "react-icons/fi";
import { SIDEBAR_ITEMS } from "../../constants";
import EthPriceWidget from "../EthPriceWidget/EthPriceWidget";
import { useNetworkContracts } from "../../hooks/useNetworkContracts";

const iconMap = { FiHome, FiGrid, FiPlus, FiUser, FiHeart, FiSettings, FiSearch };

export default function Sidebar({ isOpen, onToggle, isCollapsed, onToggleCollapse }) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const { adminAddress: ADMIN_ADDRESS } = useNetworkContracts();

  useEffect(() => {
    if (address && ADMIN_ADDRESS) {
      setIsAdmin(address.toLowerCase() === ADMIN_ADDRESS.toLowerCase());
    } else {
      setIsAdmin(false);
    }
  }, [address, ADMIN_ADDRESS]);

  const filteredItems = SIDEBAR_ITEMS.filter(
    (item) => !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      <div
        className={`
          ef-sidebar
          fixed top-0 left-0 h-full flex flex-col
          dark:bg-primary-900
          border-r dark:border-primary-700
          z-50 transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "w-16" : "w-64"}
          md:translate-x-0
        `}
      >
        {/* Brand */}
        <div className={`ef-sidebar-brand-border flex items-center justify-between p-4 border-b shrink-0`}>
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-emerald-glow">
                <img src="/favicon.svg" alt="EthosFund" className="w-full h-full" />
              </div>
              <div>
                <span className="text-lg font-bold font-display text-white dark:text-white">EthosFund</span>
                <p className="text-xs" style={{ color: "#6ee7b7" }}>Decentralised Funding</p>
              </div>
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="ef-sidebar-toggle-btn hidden md:flex p-1.5 rounded-lg transition-colors"
          >
            <FiChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`} />
          </button>

          <button onClick={onToggle} className="ef-sidebar-toggle-btn md:hidden p-1.5 rounded-lg transition-colors">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <nav className="p-3 space-y-1 shrink-0">
            {filteredItems.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive = router.pathname === item.path;

              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`
                    ef-sidebar-nav-item
                    ${isActive ? "active" : ""}
                    flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    dark:${isActive
                      ? "bg-secondary-900/20 text-secondary-400 font-semibold"
                      : "text-gray-300 hover:bg-primary-800"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                  title={isCollapsed ? item.label : ""}
                >
                  <Icon className={`ef-sidebar-nav-icon w-5 h-5 flex-shrink-0`} />
                  {!isCollapsed && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                  {!isCollapsed && item.adminOnly && (
                    <span className="ml-auto text-xs bg-amber-500/20 text-amber-300 dark:bg-accent-900/20 dark:text-accent-400 px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Wallet status */}
          {!isCollapsed && (
            <div className="px-4 pb-4 shrink-0">
              <div className="ef-sidebar-divider pt-4 border-t">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${isConnected ? "ef-sidebar-status-connected" : "ef-sidebar-status-disconnected"
                  } dark:${isConnected
                    ? "bg-secondary-900/20 text-secondary-400"
                    : "bg-red-900/20 text-red-400"
                  }`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400"}`} />
                  <span className="text-sm font-medium">
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>

                {isConnected && address && (
                  <div className="mt-2 space-y-1">
                    <div className="ef-sidebar-address text-xs px-3 dark:text-gray-400">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center space-x-1 px-3 mt-1.5">
                        <FiSettings className="w-3 h-3 ef-sidebar-admin-badge dark:text-accent-400" />
                        <span className="text-xs ef-sidebar-admin-badge dark:text-accent-400 font-medium">
                          Admin Account
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center pb-4">
            <EthPriceWidget isCollapsed={isCollapsed} />
          </div>
        </div>
      </div>
    </>
  );
}
