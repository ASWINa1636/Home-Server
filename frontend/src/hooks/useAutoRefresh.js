/**
 * useAutoRefresh.js — Hook for auto-refreshing admin pages cleanly.
 * Pauses automatically when tab is hidden or interval is set to 0 (off).
 * Features lastUpdated timestamp, manual refresh trigger, and configurable interval.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useAutoRefresh(fetchFn, defaultInterval = 20000) {
  const [intervalMs, setIntervalMs] = useState(() => {
    const saved = localStorage.getItem('admin_refresh_interval');
    return saved !== null ? parseInt(saved, 10) : defaultInterval;
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetchRef = useRef(fetchFn);

  // Keep fetch ref updated
  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  // Manual refresh caller
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (fetchRef.current) await fetchRef.current();
      setLastUpdated(new Date());
    } catch {
      // Ignore background errors
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Update localStorage when interval changes
  const updateInterval = (ms) => {
    setIntervalMs(ms);
    localStorage.setItem('admin_refresh_interval', ms.toString());
  };

  useEffect(() => {
    if (intervalMs <= 0) return; // Disabled

    const timer = setInterval(() => {
      // Only refresh if tab is active/visible
      if (!document.hidden) {
        refresh();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs, refresh]);

  return {
    lastUpdated,
    isRefreshing,
    refresh,
    intervalMs,
    updateInterval,
  };
}
