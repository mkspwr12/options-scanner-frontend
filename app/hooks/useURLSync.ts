'use client';

import { useEffect, useRef } from 'react';
import type { FilterState } from '../types/scanner';
import { serializeFilters, deserializeFilters } from '../utils/filterSerializer';
import { DEFAULT_FILTERS } from '../utils/filterDefaults';

/**
 * Sync FilterState ↔ URL query params.
 *
 * - On mount: reads URL params → returns initial filters (merged with defaults)
 * - On filter change: writes current filters to URL (replaceState, no navigation)
 *
 * See SPEC-2.md Section 5.1 (useURLSync).
 */
export function useURLSync(
  filters: FilterState,
  dispatch: (action: { type: 'SET_FILTER'; payload: Partial<FilterState> }) => void,
): void {
  const isInitialMount = useRef(true);

  // Read URL params on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.toString() === '') return;

    const fromURL = deserializeFilters(params);
    if (Object.keys(fromURL).length > 0) {
      dispatch({ type: 'SET_FILTER', payload: fromURL });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only

  // Write filters to URL on change (skip initial mount)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const params = serializeFilters(filters);
    const search = params.toString();
    const url = search
      ? `${window.location.pathname}?${search}`
      : window.location.pathname;

    window.history.replaceState(null, '', url);
  }, [filters]);
}
