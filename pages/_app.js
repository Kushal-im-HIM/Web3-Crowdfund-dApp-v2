// pages/_app.js
// UPGRADE: Fixed loading screen branding (was "Initializing Supply Chain DApp..."
//          — wrong product name + wrong colour). Now shows EthosFund branding
//          with an emerald ring spinner. First impression matters.

import "../styles/globals.css";
import { useEffect, useState } from "react";
import { WagmiConfig } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config, chains } from "../config/wagmi";
import "@rainbow-me/rainbowkit/styles.css";
import GlobalErrorBoundary from "../components/Layout/GlobalErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 3 },
  },
});

function MyApp({ Component, pageProps }) {
  const [mounted, setMounted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setIsHydrated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || !isHydrated) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0, left: 0,
          width: "100vw", height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0f172a",
          color: "#ffffff",
          fontFamily: "'Space Grotesk', 'Inter', system-ui, -apple-system, sans-serif",
          zIndex: 9999,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
          {/* EthosFund logo mark */}
          <div style={{
            width: "56px", height: "56px",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            borderRadius: "14px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(16, 185, 129, 0.35)",
            fontSize: "22px", fontWeight: "700", color: "#ffffff",
            letterSpacing: "-0.5px",
          }}>
            EF
          </div>

          {/* Emerald ring spinner */}
          <div style={{
            width: "40px", height: "40px",
            border: "3px solid rgba(16, 185, 129, 0.2)",
            borderTop: "3px solid #10b981",
            borderRadius: "50%",
            animation: "spin 0.85s linear infinite",
          }} />

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: "600", color: "#f8fafc", letterSpacing: "-0.3px" }}>
              EthosFund
            </div>
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
              Decentralised Funding
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            0%   { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="hydration-safe hydrated">
      <GlobalErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <WagmiConfig config={config}>
            <RainbowKitProvider chains={chains}>
              <Component {...pageProps} />
            </RainbowKitProvider>
          </WagmiConfig>
        </QueryClientProvider>
      </GlobalErrorBoundary>
    </div>
  );
}

export default MyApp;
