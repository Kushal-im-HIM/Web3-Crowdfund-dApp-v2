/**
 * components/KeyboardShortcuts.js
 *
 * Idea 2 — Keyboard shortcuts panel.
 * Press "?" anywhere to open. Registered shortcuts navigate the app.
 * Mounts once in Layout.js — zero code needed in individual pages.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { FiCommand, FiX } from "react-icons/fi";

const SHORTCUTS = [
  { keys: ["G", "D"], label: "Go to Dashboard", path: "/dashboard" },
  { keys: ["G", "C"], label: "Go to Campaigns", path: "/campaigns" },
  { keys: ["G", "N"], label: "Create Campaign", path: "/create-campaign" },
  { keys: ["G", "M"], label: "My Campaigns", path: "/my-campaigns" },
  { keys: ["G", "B"], label: "My Contributions", path: "/contributions" },
  { keys: ["G", "T"], label: "Transparency", path: "/transparency" },
  { keys: ["?"], label: "Open this panel", path: null },
  { keys: ["Esc"], label: "Close panel / go back", path: null },
];

function Key({ k }) {
  return (
    <kbd style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 24, height: 22, padding: "0 6px",
      background: "var(--color-background-secondary)",
      border: "0.5px solid var(--color-border-secondary)",
      borderRadius: 5,
      fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 500,
      color: "var(--color-text-primary)",
    }}>
      {k}
    </kbd>
  );
}

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pendingKey = { current: null };

  const handleKey = useCallback((e) => {
    // Don't fire in inputs/textareas
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

    if (e.key === "?" || e.key === "/") {
      e.preventDefault();
      setOpen(prev => !prev);
      return;
    }
    if (e.key === "Escape") { setOpen(false); return; }

    // Two-key sequences: G + second key
    if (e.key.toUpperCase() === "G") {
      pendingKey.current = "G";
      setTimeout(() => { pendingKey.current = null; }, 1000);
      return;
    }

    if (pendingKey.current === "G") {
      const match = SHORTCUTS.find(s =>
        s.keys.length === 2 &&
        s.keys[0] === "G" &&
        s.keys[1] === e.key.toUpperCase()
      );
      if (match && match.path) {
        setOpen(false);
        router.push(match.path);
      }
      pendingKey.current = null;
    }
  }, [router]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Keyboard shortcuts (?)"
        style={{
          position: "fixed", bottom: 80, right: 24, zIndex: 40,
          width: 36, height: 36, borderRadius: 10,
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-secondary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <FiCommand style={{ width: 15, height: 15, color: "var(--color-text-secondary)" }} />
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(6, 78, 59, 0.35)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-secondary)",
          borderRadius: 16, width: "100%", maxWidth: 400, overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FiCommand style={{ width: 16, height: 16, color: "var(--color-text-secondary)" }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>Keyboard shortcuts</span>
          </div>
          <button onClick={() => setOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--color-text-secondary)", display: "flex" }}>
            <FiX style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Navigation group */}
        <div style={{ padding: "12px 20px 4px" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Navigation</p>
          {SHORTCUTS.filter(s => s.keys[0] === "G").map((s, i) => (
            <div key={i} onClick={() => { setOpen(false); s.path && router.push(s.path); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", cursor: s.path ? "pointer" : "default", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{s.label}</span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {s.keys.map((k, ki) => <Key key={ki} k={k} />)}
              </div>
            </div>
          ))}
        </div>

        {/* General group */}
        <div style={{ padding: "8px 20px 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, marginTop: 8 }}>General</p>
          {SHORTCUTS.filter(s => s.keys[0] !== "G").map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{s.label}</span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {s.keys.map((k, ki) => <Key key={ki} k={k} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
