'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Generic debounce hook — delays updating a value until after
 * `delay` ms have passed since the last change.
 *
 * Used by useScanFilters to batch rapid slider adjustments
 * before firing an API call. See SPEC-2.md Section 5.1.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Immediate update when delay is 0 (used by preset load)
    if (delay <= 0) {
      setDebouncedValue(value);
      return;
    }

    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}
