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
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

function MyApp({ Component, pageProps }) {
  const [mounted, setMounted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);

    // Additional delay to ensure complete hydration
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show loading state until hydration is complete
  if (!mounted || !isHydrated) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0f0f0f",
          color: "#ffffff",
          fontSize: "16px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              border: "4px solid #333",
              borderTop: "4px solid #007bff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          <div style={{ fontSize: "18px", fontWeight: "500" }}>
            Initializing Supply Chain DApp...
          </div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
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
