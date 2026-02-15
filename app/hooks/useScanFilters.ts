'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { FilterState, ScanResult, ScanResponse, FilterAction } from '../types/scanner';
import { useDebounce } from './useDebounce';
import { serializeFilters, hashFilters } from '../utils/filterSerializer';
import { FILTER_DEBOUNCE_MS, CACHE_TTL_MS, MAX_CACHE_ENTRIES } from '../utils/filterDefaults';

const DEFAULT_API_BASE = 'https://options-scanner-backend-2exk6s.azurewebsites.net';
const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_BASE || DEFAULT_API_BASE)
  : DEFAULT_API_BASE;

interface CacheEntry {
  data: ScanResponse;
  timestamp: number;
}

/** In-memory LRU filter-result cache keyed by filter hash */
const filterCache = new Map<string, CacheEntry>();

function evictStaleEntries(): void {
  const now = Date.now();
  for (const [key, entry] of filterCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      filterCache.delete(key);
    }
  }
  // LRU eviction if over max size
  while (filterCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = filterCache.keys().next().value;
    if (oldestKey !== undefined) {
      filterCache.delete(oldestKey);
    }
  }
}

/** Map snake_case API response to camelCase ScanResult */
function mapResult(raw: Record<string, unknown>): ScanResult {
  const greeks = (raw.greeks ?? {}) as Record<string, unknown>;
  return {
    symbol: String(raw.symbol ?? ''),
    optionType: raw.option_type === 'put' ? 'put' : 'call',
    strike: Number(raw.strike ?? raw.strikePrice ?? 0),
    expiration: String(raw.expiration ?? raw.expirationDate ?? ''),
    dte: Number(raw.dte ?? 0),
    ivPercentile: Number(raw.iv_percentile ?? raw.ivPercentile ?? 0),
    volume: Number(raw.volume ?? 0),
    openInterest: Number(raw.open_interest ?? raw.openInterest ?? 0),
    volumeOIRatio: Number(raw.volume_oi_ratio ?? raw.volumeOIRatio ?? 0),
    delta: Number(raw.delta ?? greeks.delta ?? 0),
    theta: Number(raw.theta ?? greeks.theta ?? 0),
    vega: Number(raw.vega ?? greeks.vega ?? 0),
    gamma: Number(raw.gamma ?? greeks.gamma ?? 0),
    bid: Number(raw.bid ?? 0),
    ask: Number(raw.ask ?? 0),
    last: Number(raw.last ?? raw.currentPrice ?? 0),
    underlyingPrice: Number(raw.underlying_price ?? raw.underlyingPrice ?? 0),
  };
}

interface UseScanFiltersResult {
  results: ScanResult[];
  totalCount: number;
  filteredCount: number;
  isLoading: boolean;
  error: string | null;
  cacheAgeSeconds: number;
  refetch: () => void;
}

/**
 * Debounced API fetch with in-memory cache.
 * See SPEC-2.md Section 5.1 for the hook architecture.
 */
export function useScanFilters(
  filters: FilterState,
  dispatch: React.Dispatch<FilterAction>,
): UseScanFiltersResult {
  const debouncedFilters = useDebounce(filters, FILTER_DEBOUNCE_MS);
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<UseScanFiltersResult>({
    results: [],
    totalCount: 0,
    filteredCount: 0,
    isLoading: false,
    error: null,
    cacheAgeSeconds: 0,
    refetch: () => {},
  });

  const fetchResults = useCallback(async (filtersToFetch: FilterState) => {
    const hash = hashFilters(filtersToFetch);

    // Check cache
    evictStaleEntries();
    const cached = filterCache.get(hash);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      dispatch({ type: 'SET_RESULTS', payload: cached.data });
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    // Abort previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const params = serializeFilters(filtersToFetch);
      const url = `${API_BASE}/api/scan${params.toString() ? '?' + params.toString() : ''}`;

      const response = await fetch(url, {
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limited — please wait before scanning again.');
        }
        throw new Error(`Scan failed (HTTP ${response.status})`);
      }

      const json = await response.json();

      // Handle both legacy format (opportunities array) and new format (results array)
      const rawResults: Record<string, unknown>[] =
        json.results ?? json.opportunities ?? [];

      const scanResponse: ScanResponse = {
        results: rawResults.map(mapResult),
        totalCount: Number(json.total_count ?? json.totalCount ?? rawResults.length),
        filteredCount: Number(json.filtered_count ?? json.filteredCount ?? rawResults.length),
        cacheAgeSeconds: Number(json.cache_age_seconds ?? json.cacheAgeSeconds ?? 0),
        dataDelayMinutes: Number(json.data_delay_minutes ?? json.dataDelayMinutes ?? 15),
      };

      // Store in cache
      filterCache.set(hash, { data: scanResponse, timestamp: Date.now() });

      dispatch({ type: 'SET_RESULTS', payload: scanResponse });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // Silently ignore aborted requests
      }
      const message = err instanceof Error ? err.message : 'Unknown scan error';
      dispatch({ type: 'SET_ERROR', payload: message });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  // Fetch when debounced filters change
  useEffect(() => {
    fetchResults(debouncedFilters);
  }, [debouncedFilters, fetchResults]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  // Build the return ref from context (consumers read from context directly)
  resultRef.current.refetch = () => fetchResults(debouncedFilters);

  return resultRef.current;
}
