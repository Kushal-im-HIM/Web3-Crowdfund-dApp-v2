/**
 * components/TxToast.js
 *
 * Idea 5 — Live transaction toast with Etherscan link.
 * Call showTxToast(txHash, networkName) immediately after tx submission.
 * The toast persists with a spinner until dismissed; shows Etherscan link.
 *
 * Usage:
 *   import { showTxToast, showTxSuccess, showTxError } from "../TxToast";
 *   const tx = await contribute?.(...)
 *   if (tx?.hash) showTxToast(tx.hash, blockExplorer);
 */

import toast from "react-hot-toast";
import { FiExternalLink, FiCheckCircle, FiXCircle, FiLoader } from "react-icons/fi";

function ExplorerLink({ hash, baseUrl }) {
  if (!baseUrl || !hash) return null;
  const url = `${baseUrl}/tx/${hash}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6ee7b7", marginTop: 4, fontWeight: 500 }}
    >
      View on Etherscan
      <FiExternalLink style={{ width: 11, height: 11 }} />
    </a>
  );
}

// Pending tx toast — persists until manually dismissed or replaced
export function showTxToast(hash, blockExplorer) {
  return toast(
    (t) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 14, height: 14, border: "2px solid #6ee7b7", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#d1fae5" }}>Transaction submitted</span>
        </div>
        {hash && <ExplorerLink hash={hash} baseUrl={blockExplorer} />}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    ),
    {
      id: hash || "tx-pending",
      duration: Infinity,
      style: { background: "#065f46", color: "#d1fae5", border: "1px solid #047857" },
    }
  );
}

export function showTxSuccess(hash, blockExplorer, message = "Transaction confirmed!") {
  toast.dismiss(hash || "tx-pending");
  toast.success(
    (t) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
        {hash && <ExplorerLink hash={hash} baseUrl={blockExplorer} />}
      </div>
    ),
    {
      duration: 6000,
      style: { background: "#064e3b", color: "#d1fae5", border: "1px solid #065f46" },
    }
  );
}

export function showTxError(hash, error) {
  toast.dismiss(hash || "tx-pending");
  const reason = error?.reason || error?.message?.slice(0, 80) || "Transaction failed";
  toast.error(reason, {
    duration: 6000,
    style: { background: "#7f1d1d", color: "#fee2e2", border: "1px solid #991b1b" },
  });
}
