/**
 * components/Layout/Layout.js
 *
 * UPGRADE v2 — Emerald Forest light mode:
 *   Light mode: bg-emerald-50 (#ecfdf5) — subtle mint tint, not plain white.
 *   This gives the content area personality vs the stark beige/white it was.
 *   Dark mode: bg-primary-900 — unchanged.
 */

import { useState } from "react";
import { Toaster } from "react-hot-toast";
import KeyboardShortcuts from "./KeyboardShortcuts";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-emerald-50 dark:bg-primary-900 transition-colors duration-300">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className={`transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isCollapsed={sidebarCollapsed} />
        <main className="p-4 md:p-6">{children}</main>
      </div>

      <KeyboardShortcuts />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: "#064e3b", color: "#d1fae5", border: "1px solid #065f46" },
          success: { duration: 3000, style: { background: "#064e3b", color: "#d1fae5" } },
          error: { style: { background: "#7f1d1d", color: "#fee2e2" } },
        }}
      />
    </div>
  );
}
