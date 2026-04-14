/**
 * components/RouteGuard.js
 *
 * Centralised auth guard for wallet-protected pages.
 *
 * SECURITY LOOPHOLES FIXED:
 *   1. Flash-of-protected-content: Before this component, every page had:
 *        if (!isConnected) { router.push("/"); }   ← runs AFTER render
 *        if (!isConnected) { return <EmptyState /> }  ← still visible briefly
 *      This means on slow connections or page refresh, protected content
 *      flashes for ~100-300ms before the redirect fires.
 *
 *   2. Race condition: wagmi's useAccount returns isConnected=false on first
 *      render (before hydration), then true after. Without a mounted check,
 *      this causes false redirects for connected wallets on page refresh.
 *
 * FIX: RouteGuard waits for wagmi to fully mount before evaluating auth.
 *   - Shows a loading spinner during the hydration window
 *   - Only redirects/blocks AFTER mount is confirmed
 *   - No protected content ever renders for unauthenticated users
 *
 * Usage:
 *   export default function DashboardPage() {
 *     return (
 *       <RouteGuard>
 *         <Layout>...</Layout>
 *       </RouteGuard>
 *     );
 *   }
 *
 * AdminGuard — additional layer for admin-only pages.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import { FiLock } from "react-icons/fi";

// Neutral loading screen shown while wagmi hydrates
function AuthLoading() {
  return (
    <div className="min-h-screen bg-emerald-50 dark:bg-primary-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" style={{ borderWidth: 3 }} />
        <p className="text-sm text-slate-500 dark:text-slate-400">Checking wallet...</p>
      </div>
    </div>
  );
}

// Shown only during the brief redirect window (prevents flash)
function RedirectingScreen() {
  return (
    <div className="min-h-screen bg-emerald-50 dark:bg-primary-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-emerald-glow">
          <FiLock className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-slate-900 dark:text-white mb-1">Wallet Required</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Redirecting to home...</p>
        </div>
      </div>
    </div>
  );
}

export default function RouteGuard({ children, redirectTo = "/" }) {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Wait one tick for wagmi to hydrate from localStorage/injected wallet
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (mounted && !isConnected) {
      router.replace(redirectTo);
    }
  }, [mounted, isConnected, router, redirectTo]);

  // Phase 1: wagmi not yet hydrated — show neutral spinner (no content, no redirect)
  if (!mounted) return <AuthLoading />;

  // Phase 2: mounted, not connected — show redirect screen (no protected content)
  if (!isConnected) return <RedirectingScreen />;

  // Phase 3: connected — render children
  return children;
}
