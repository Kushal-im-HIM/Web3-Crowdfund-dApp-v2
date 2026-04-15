/**
 * hooks/useCampaignBookmarks.js
 *
 * Idea 3 — Campaign bookmarks / watchlist.
 * Persists bookmarked campaign IDs to localStorage, keyed by wallet address.
 * Falls back to a guest key when wallet is not connected.
 */

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";

const storageKey = (address) =>
  `ethosfund_bookmarks_${address ? address.toLowerCase() : "guest"}`;

export function useCampaignBookmarks() {
  const { address } = useAccount();
  const [bookmarks, setBookmarks] = useState(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load on mount / wallet change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(address));
      setBookmarks(new Set(raw ? JSON.parse(raw) : []));
    } catch {
      setBookmarks(new Set());
    }
    setLoaded(true);
  }, [address]);

  const persist = useCallback((next) => {
    try {
      localStorage.setItem(storageKey(address), JSON.stringify([...next]));
    } catch {}
    setBookmarks(new Set(next));
  }, [address]);

  const toggle = useCallback((campaignId) => {
    const id = String(campaignId);
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      persist(next);
      return new Set(next);
    });
  }, [persist]);

  const isBookmarked = useCallback((campaignId) =>
    bookmarks.has(String(campaignId)), [bookmarks]);

  return { bookmarks, toggle, isBookmarked, loaded };
}
