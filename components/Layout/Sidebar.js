import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import {
  FiHome,
  FiGrid,
  FiPlus,
  FiUser,
  FiHeart,
  FiSettings,
  FiMenu,
  FiX,
  FiChevronLeft,
} from "react-icons/fi";
import { SIDEBAR_ITEMS, ADMIN_ADDRESS } from "../../constants";

const iconMap = {
  FiHome,
  FiGrid,
  FiPlus,
  FiUser,
  FiHeart,
  FiSettings,
};

export default function Sidebar({
  isOpen,
  onToggle,
  isCollapsed,
  onToggleCollapse,
}) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);

  // ═══════════════════════════════════════════════════════════
  // UPDATED ADMIN CHECK - Uses ADMIN_ADDRESS from constants
  // This properly handles localhost vs Sepolia admin addresses
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (address && ADMIN_ADDRESS) {
      const userIsAdmin = address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
      setIsAdmin(userIsAdmin);

      // Debug log for development (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Sidebar] Admin check:', {
          userAddress: address,
          adminAddress: ADMIN_ADDRESS,
          isAdmin: userIsAdmin
        });
      }
    } else {
      setIsAdmin(false);
    }
  }, [address]);

  // ═══════════════════════════════════════════════════════════
  // OLD ADMIN CHECK (COMMENTED OUT FOR REFERENCE)
  // This was using NEXT_PUBLIC_ADMIN_ADDRESS directly which doesn't
  // properly handle multi-network configurations
  // ═══════════════════════════════════════════════════════════
  /*
  useEffect(() => {
    // Check if user is admin (you can implement your admin check logic here)
    // For now, we'll use a simple check or environment variable
    const adminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS;
    setIsAdmin(address?.toLowerCase() === adminAddress?.toLowerCase());
  }, [address]);
  */

  const filteredItems = SIDEBAR_ITEMS.filter(
    (item) => !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed top-0 left-0 h-full bg-white dark:bg-primary-900 border-r border-gray-200 dark:border-primary-700 z-50 transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        ${isCollapsed ? "w-16" : "w-64"}
        md:translate-x-0
      `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-primary-700">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              {/* Updated logo with new color scheme */}
              <div className="w-10 h-10 bg-gradient-emerald rounded-xl flex items-center justify-center shadow-emerald-glow">
                <span className="text-white font-bold text-lg">CF</span>
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  CrowdFund Pro
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Web3 Innovation</p>
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-primary-800 transition-colors"
          >
            <FiChevronLeft
              className={`w-4 h-4 text-gray-500 transition-transform ${isCollapsed ? "rotate-180" : ""
                }`}
            />
          </button>

          {/* Mobile Close */}
          <button
            onClick={onToggle}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-primary-800 transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {filteredItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = router.pathname === item.path;

            return (
              <Link
                key={item.id}
                href={item.path}
                className={`
                  flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${isActive
                    ? "bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400 border-r-2 border-secondary-600"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-primary-800"
                  }
                  ${isCollapsed ? "justify-center" : ""}
                `}
                title={isCollapsed ? item.label : ""}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
                {/* Admin badge for admin-only items */}
                {!isCollapsed && item.adminOnly && (
                  <span className="ml-auto text-xs bg-accent-100 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400 px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Connection Status */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-primary-700">
            <div
              className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg
              ${isConnected
                  ? "bg-secondary-50 dark:bg-secondary-900/20 text-secondary-700 dark:text-secondary-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                }
            `}
            >
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-secondary-500" : "bg-red-500"
                  }`}
              />
              <span className="text-sm font-medium">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>

            {isConnected && address && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-gray-500 dark:text-gray-400 px-3">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                {/* Show admin badge in sidebar footer if user is admin */}
                {isAdmin && (
                  <div className="flex items-center space-x-1 px-3">
                    <FiSettings className="w-3 h-3 text-accent-600 dark:text-accent-400" />
                    <span className="text-xs text-accent-600 dark:text-accent-400 font-medium">
                      Admin Account
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          OLD SIDEBAR CODE (COMMENTED OUT FOR REFERENCE)
          ═══════════════════════════════════════════════════════════
      <div
        className={`
        fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-50 transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        ${isCollapsed ? "w-16" : "w-64"}
        md:translate-x-0
      `}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CF</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                CrowdFund Pro
              </span>
            </div>
          )}
          ...
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {filteredItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = router.pathname === item.path;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`
                  flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }
                  ${isCollapsed ? "justify-center" : ""}
                `}
                title={isCollapsed ? item.label : ""}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
        
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div
              className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg
              ${
                isConnected
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }
            `}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>

            {isConnected && address && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 px-3">
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
            )}
          </div>
        )}
      </div>
      */}
    </>
  );
}
