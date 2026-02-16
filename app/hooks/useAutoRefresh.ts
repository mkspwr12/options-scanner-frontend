'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseAutoRefreshResult {
  /** Milliseconds remaining until next refresh */
  timeUntilRefresh: number;
  /** Whether the timer is currently running */
  isActive: boolean;
}

/**
 * Hook that calls `callback` every `intervalMs` when `enabled` is true.
 * Also exposes a countdown so the UI can show time-until-next-refresh.
 */
export function useAutoRefresh(
  callback: () => void,
  intervalMs: number,
  enabled: boolean,
): UseAutoRefreshResult {
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(intervalMs);
  const callbackRef = useRef(callback);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep callback ref fresh without re-triggering effect
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      setTimeUntilRefresh(intervalMs);
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }

    setTimeUntilRefresh(intervalMs);

    tickRef.current = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        const next = prev - 1_000;
        if (next <= 0) {
          callbackRef.current();
          return intervalMs;
        }
        return next;
      });
    }, 1_000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [enabled, intervalMs]);

  return { timeUntilRefresh, isActive: enabled };
}
