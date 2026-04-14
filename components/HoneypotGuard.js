/**
 * components/HoneypotGuard.js
 *
 * Lightweight anti-bot protection for the CreateCampaign form.
 * Works WITHOUT a third-party service or API key.
 *
 * Technique: CSS honeypot field + timing check.
 *   1. A hidden input field is added to the form. Bots fill every field
 *      they see; humans never see or touch it (CSS: display:none).
 *   2. A timestamp is recorded when the form first mounts. If the form
 *      is submitted too quickly (<3s), it's flagged as a bot.
 *
 * Why no reCAPTCHA/hCaptcha:
 *   - Those require API keys and a backend to verify tokens.
 *   - For a student dApp (no server), this honeypot approach is the
 *     correct lightweight choice.
 *   - In production with a backend, swap in hCaptcha (free tier, GDPR-safe).
 *
 * Usage:
 *   const { HoneypotField, validateHoneypot } = useHoneypot();
 *   // In JSX: <HoneypotField />
 *   // On submit: if (!validateHoneypot()) return;
 */

import { useRef, useCallback } from "react";

export function useHoneypot() {
  const mountTime = useRef(Date.now());
  const honeypotRef = useRef(null);

  const validateHoneypot = useCallback(() => {
    // Check 1: honeypot field must be empty
    if (honeypotRef.current && honeypotRef.current.value !== "") {
      console.warn("[HoneypotGuard] Bot detected: honeypot field filled");
      return false;
    }

    // Check 2: minimum interaction time (3 seconds)
    const elapsed = Date.now() - mountTime.current;
    if (elapsed < 3000) {
      console.warn("[HoneypotGuard] Bot detected: form submitted too fast");
      return false;
    }

    return true;
  }, []);

  // The field itself — hidden via CSS, never shown to real users
  const HoneypotField = () => (
    <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 0, height: 0, overflow: "hidden" }}>
      <label htmlFor="ef_website">Website</label>
      <input
        ref={honeypotRef}
        id="ef_website"
        name="ef_website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );

  return { HoneypotField, validateHoneypot };
}

/**
 * Rate limiter for wallet interactions.
 * Prevents rapid-fire contract calls (accidental double-click, bot spam).
 * Pure in-memory, no server needed.
 */
export function useRateLimit(limitMs = 5000) {
  const lastCallRef = useRef(0);

  const checkRateLimit = useCallback((actionName = "action") => {
    const now = Date.now();
    const elapsed = now - lastCallRef.current;
    if (elapsed < limitMs) {
      const remaining = Math.ceil((limitMs - elapsed) / 1000);
      return {
        allowed: false,
        message: `Please wait ${remaining}s before trying again.`,
      };
    }
    lastCallRef.current = now;
    return { allowed: true };
  }, [limitMs]);

  return { checkRateLimit };
}
