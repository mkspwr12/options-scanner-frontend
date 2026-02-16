'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  OptionsChain,
  OptionContract,
  ConnectionState,
  RateLimitInfo,
  CircuitBreakerState,
} from '../types/yahoo-finance';
import { CircuitBreaker } from '../utils/circuitBreaker';

const DEFAULT_API_BASE = 'https://options-scanner-backend-2exk6s.azurewebsites.net';
const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE || DEFAULT_API_BASE)
    : DEFAULT_API_BASE;

const CACHE_TTL_MS = 60_000; // 60 seconds

interface CacheEntry {
  data: OptionsChain;
  timestamp: number;
}

/** In-memory cache keyed by ticker */
const chainCache = new Map<string, CacheEntry>();

/** Map a single raw contract object to OptionContract */
function mapContract(raw: Record<string, unknown>): OptionContract {
  return {
    contractSymbol: String(raw.contract_symbol ?? raw.contractSymbol ?? ''),
    strike: Number(raw.strike ?? 0),
    expiration: String(raw.expiration ?? ''),
    optionType: raw.option_type === 'put' || raw.optionType === 'put' ? 'put' : 'call',
    bid: Number(raw.bid ?? 0),
    ask: Number(raw.ask ?? 0),
    last: Number(raw.last ?? raw.lastPrice ?? 0),
    volume: Number(raw.volume ?? 0),
    openInterest: Number(raw.open_interest ?? raw.openInterest ?? 0),
    impliedVolatility: Number(raw.implied_volatility ?? raw.impliedVolatility ?? 0),
    delta: Number(raw.delta ?? 0),
    gamma: Number(raw.gamma ?? 0),
    theta: Number(raw.theta ?? 0),
    vega: Number(raw.vega ?? 0),
    inTheMoney: Boolean(raw.in_the_money ?? raw.inTheMoney ?? false),
  };
}

/** Map raw API response to OptionsChain */
function mapChain(ticker: string, json: Record<string, unknown>): OptionsChain {
  const rawContracts: Record<string, unknown>[] =
    (json.contracts as Record<string, unknown>[]) ?? [];
  const rawDates: string[] =
    (json.expiration_dates as string[]) ?? (json.expirationDates as string[]) ?? [];

  return {
    ticker,
    underlyingPrice: Number(json.underlying_price ?? json.underlyingPrice ?? 0),
    expirationDates: rawDates,
    contracts: rawContracts.map(mapContract),
    lastUpdated: Date.now(),
    dataDelayMinutes: Number(json.data_delay_minutes ?? json.dataDelayMinutes ?? 15),
  };
}

export interface UseOptionsChainResult {
  chain: OptionsChain | null;
  isLoading: boolean;
  error: string | null;
  connectionState: ConnectionState;
  rateLimit: RateLimitInfo;
  refetch: () => void;
  circuitBreaker: CircuitBreakerState;
}

const breaker = new CircuitBreaker();

/**
 * Custom hook for fetching options chain data from the backend.
 * Uses in-memory Map cache with 60 s TTL and circuit breaker protection.
 */
export function useOptionsChain(
  ticker: string,
  refreshIntervalMs: number = 60_000,
): UseOptionsChainResult {
  const [chain, setChain] = useState<OptionsChain | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>({
    requestsUsed: 0,
    requestsLimit: 100,
    resetTime: Date.now() + 3_600_000,
  });
  const abortRef = useRef<AbortController | null>(null);

  const fetchChain = useCallback(async (symbol: string) => {
    if (!symbol.trim()) return;

    // Circuit breaker check
    if (!breaker.canRequest()) {
      setError('Circuit breaker open — too many failures. Retrying after cooldown.');
      setConnectionState('offline');
      return;
    }

    // Cache check
    const cached = chainCache.get(symbol.toUpperCase());
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setChain(cached.data);
      setIsLoading(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}/api/options-chain/${encodeURIComponent(symbol)}`;
      const response = await fetch(url, { signal: abortRef.current.signal });

      // Parse rate-limit headers if present
      const used = response.headers.get('x-ratelimit-used');
      const limit = response.headers.get('x-ratelimit-limit');
      const reset = response.headers.get('x-ratelimit-reset');
      if (used || limit || reset) {
        setRateLimit({
          requestsUsed: Number(used ?? rateLimit.requestsUsed),
          requestsLimit: Number(limit ?? rateLimit.requestsLimit),
          resetTime: reset ? Number(reset) * 1000 : rateLimit.resetTime,
        });
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limited — please wait before requesting again.');
        }
        throw new Error(`Options chain fetch failed (HTTP ${response.status})`);
      }

      const json = await response.json();
      const mapped = mapChain(symbol, json);

      chainCache.set(symbol.toUpperCase(), { data: mapped, timestamp: Date.now() });

      setChain(mapped);
      setIsLoading(false);
      setConnectionState('connected');
      breaker.recordSuccess();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;

      const message = err instanceof Error ? err.message : 'Unknown error fetching options chain';
      setError(message);
      setIsLoading(false);
      breaker.recordFailure();

      const cbState = breaker.getState();
      setConnectionState(cbState.state === 'open' ? 'offline' : 'degraded');
    }
  }, [rateLimit]);

  // Fetch on ticker change
  useEffect(() => {
    fetchChain(ticker);

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [ticker, fetchChain]);

  const refetch = useCallback(() => {
    // Bust cache for manual refetch
    chainCache.delete(ticker.toUpperCase());
    fetchChain(ticker);
  }, [ticker, fetchChain]);

  return {
    chain,
    isLoading,
    error,
    connectionState,
    rateLimit,
    refetch,
    circuitBreaker: breaker.getState(),
  };
}
