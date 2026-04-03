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
    // ISSUE 2c FIX: bg-stone-50 (warm #FAFAF9) in light mode instead of stark primary-50.
    // dark:bg-primary-900 preserves the original dark mode background exactly.
    <div className="min-h-screen bg-stone-50 dark:bg-primary-900">
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
              primary: "#4aed88",
            },
          },
        }}
      />
    </div>
  );
}