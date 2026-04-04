/**
 * components/Layout/Layout.js
 *
 * MANDATE 5 — Light Mode Aesthetic:
 *   Root layout background updated from bg-stone-50 to bg-cream-200 (which
 *   maps to #f7f3ed — the warm cream defined in tailwind.config.js).
 *   This ensures the main content area matches the cream palette cohesively.
 *   dark:bg-primary-900 is unchanged — dark mode is untouched.
 */

import { useState } from "react";
import { Toaster } from "react-hot-toast";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleSidebarCollapse = () => setSidebarCollapsed(!sidebarCollapsed);

  return (
    // MANDATE 5: Warm cream background in light mode instead of stark white.
    // bg-[#f7f3ed] = cream-200 from our new palette. dark mode unchanged.
    <div className="min-h-screen bg-[#f7f3ed] dark:bg-primary-900 transition-colors duration-300">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      <div
        className={`
        transition-all duration-300 
        ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}
      `}
      >
        <Header onMenuToggle={toggleSidebar} isCollapsed={sidebarCollapsed} />

        <main className="p-4 md:p-6">{children}</main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
            theme: {
              primary: "#10b981",
            },
          },
        }}
      />
    </div>
  );
}
