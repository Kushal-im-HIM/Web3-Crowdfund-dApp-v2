import React from "react";
import { FiRefreshCw, FiAlertTriangle } from "react-icons/fi";

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isReloading: false,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorId: Date.now(), // Unique ID for this error instance
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Global Error Boundary caught an error:", error, errorInfo);

    // Enhanced error patterns that should trigger auto-reload
    const autoReloadErrors = [
      // Your specific error
      "Cannot read properties of undefined (reading 'length')",
      "Cannot read property 'length' of undefined",

      // Related data access errors
      "pendingUsers is undefined",
      "userDataHooks is not iterable",
      "Cannot read properties of undefined (reading 'map')",
      "Cannot read properties of undefined (reading 'filter')",
      "Cannot read properties of undefined (reading 'slice')",

      // React hydration errors that need reload
      "Hydration failed because the initial UI does not match",
      "Text content does not match server-rendered HTML",
      "Expected server HTML to contain",

      // Wagmi/Web3 connection errors
      "ChainMismatchError",
      "UserRejectedRequestError",
      "Contract call reverted",

      // Add more error patterns as needed
    ];

    // Check if it's an error we want to auto-reload for
    const shouldAutoReload = autoReloadErrors.some(
      (errorPattern) => error.message && error.message.includes(errorPattern)
    );

    if (shouldAutoReload && !this.state.isReloading) {
      console.log(
        "Detected critical error, auto-reloading page...",
        error.message
      );
      this.setState({ isReloading: true });

      // Add a small delay to show the reloading message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }

    // Log error for debugging (you can send to analytics service here)
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "exception", {
        description: error.message,
        fatal: shouldAutoReload,
      });
    }
  }

  handleManualReload = () => {
    this.setState({ isReloading: true });
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  render() {
    if (this.state.hasError) {
      // Auto-reload errors
      const autoReloadErrors = [
        "Cannot read properties of undefined (reading 'length')",
        "Cannot read property 'length' of undefined",
        "pendingUsers is undefined",
        "userDataHooks is not iterable",
        "Cannot read properties of undefined (reading 'map')",
        "Cannot read properties of undefined (reading 'filter')",
        "Cannot read properties of undefined (reading 'slice')",
        "Hydration failed because the initial UI does not match",
        "Text content does not match server-rendered HTML",
        "Expected server HTML to contain",
      ];

      const shouldAutoReload = autoReloadErrors.some((errorPattern) =>
        this.state.error?.message?.includes(errorPattern)
      );

      if (shouldAutoReload || this.state.isReloading) {
        return (
          <div
            className="hydration-safe"
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
              zIndex: 10000,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "20px",
                maxWidth: "400px",
                padding: "40px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "16px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  border: "4px solid #333",
                  borderTop: "4px solid #007bff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              ></div>

              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    marginBottom: "8px",
                  }}
                >
                  Refreshing Application
                </div>
                <div
                  style={{ fontSize: "14px", color: "#888", lineHeight: "1.5" }}
                >
                  Detected a data synchronization issue.
                  <br />
                  The page will reload automatically to fix this.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "#666",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    backgroundColor: "#007bff",
                    borderRadius: "50%",
                    animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
                  }}
                ></div>
                Please wait...
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
              @keyframes ping {
                75%,
                100% {
                  transform: scale(2);
                  opacity: 0;
                }
              }
            `}</style>
          </div>
        );
      }

      // For other errors, show manual recovery options with your app's styling
      return (
        <div
          className="hydration-safe"
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
            zIndex: 10000,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "24px",
              maxWidth: "500px",
              padding: "40px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "16px",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                backgroundColor: "#EF4444",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 32px rgba(239, 68, 68, 0.3)",
              }}
            >
              <span style={{ fontSize: "24px" }}>⚠️</span>
            </div>

            <div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "600",
                  marginBottom: "8px",
                }}
              >
                Something went wrong
              </div>
              <div
                style={{ fontSize: "14px", color: "#888", lineHeight: "1.6" }}
              >
                An unexpected error occurred in the Supply Chain DApp.
                <br />
                Please try refreshing the page to continue.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <button
                onClick={this.handleManualReload}
                disabled={this.state.isReloading}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#007bff",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: this.state.isReloading ? "not-allowed" : "pointer",
                  opacity: this.state.isReloading ? 0.6 : 1,
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  if (!this.state.isReloading) {
                    e.target.style.backgroundColor = "#0056b3";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!this.state.isReloading) {
                    e.target.style.backgroundColor = "#007bff";
                  }
                }}
              >
                <span
                  style={{
                    animation: this.state.isReloading
                      ? "spin 1s linear infinite"
                      : "none",
                    display: "inline-block",
                  }}
                >
                  🔄
                </span>
                {this.state.isReloading ? "Refreshing..." : "Refresh Page"}
              </button>

              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "transparent",
                  color: "#888",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = "#ffffff";
                  e.target.style.borderColor = "#555";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "#888";
                  e.target.style.borderColor = "#333";
                }}
              >
                Try Again
              </button>
            </div>

            {/* Error details for development */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details style={{ width: "100%", marginTop: "16px" }}>
                <summary
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    cursor: "pointer",
                    marginBottom: "8px",
                  }}
                >
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    fontSize: "10px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    padding: "12px",
                    borderRadius: "8px",
                    overflow: "auto",
                    color: "#ff6b6b",
                    textAlign: "left",
                    maxHeight: "200px",
                    border: "1px solid rgba(255, 107, 107, 0.2)",
                  }}
                >
                  {this.state.error.message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
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

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
