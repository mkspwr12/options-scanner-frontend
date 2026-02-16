// Types for the Yahoo Finance Data Integration (Issue #5)
// See SPEC-5.md for the full type diagram

export type ConnectionState = 'connected' | 'degraded' | 'offline';

export interface OptionContract {
  contractSymbol: string;
  strike: number;
  expiration: string;
  optionType: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  inTheMoney: boolean;
}

export interface OptionsChain {
  ticker: string;
  underlyingPrice: number;
  expirationDates: string[];
  contracts: OptionContract[];
  lastUpdated: number;
  dataDelayMinutes: number;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number | null;
  cooldownMs: number;
}

export interface RateLimitInfo {
  requestsUsed: number;
  requestsLimit: number;
  resetTime: number;
}

export interface DataContextState {
  chain: OptionsChain | null;
  connectionState: ConnectionState;
  circuitBreaker: CircuitBreakerState;
  rateLimit: RateLimitInfo;
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  autoRefresh: boolean;
  refreshIntervalMs: number;
}

export type DataAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: OptionsChain }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SET_CONNECTION'; payload: ConnectionState }
  | { type: 'UPDATE_CIRCUIT_BREAKER'; payload: Partial<CircuitBreakerState> }
  | { type: 'UPDATE_RATE_LIMIT'; payload: Partial<RateLimitInfo> }
  | { type: 'SET_AUTO_REFRESH'; payload: boolean }
  | { type: 'SET_REFRESH_INTERVAL'; payload: number }
  | { type: 'DISMISS_ERROR' };
