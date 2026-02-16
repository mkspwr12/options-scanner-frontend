// Types for the Modular Data Provider feature (Issue #4)
// See SPEC-4.md for the full type diagram

import type { OptionsChain } from './yahoo-finance';

export type ProviderType = 'yahoo' | 'polygon' | 'tradier' | 'custom';
export type ProviderStatus = 'active' | 'inactive' | 'error' | 'connecting';

export interface ProviderConfig {
  id: string;
  type: ProviderType;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
  priority: number; // lower = higher priority
  rateLimitPerMinute: number;
  timeoutMs: number;
}

export interface ProviderHealth {
  providerId: string;
  status: ProviderStatus;
  latencyMs: number | null;
  lastChecked: number | null;
  errorMessage: string | null;
  successRate: number; // 0-100
}

export interface IDataProvider {
  readonly config: ProviderConfig;
  connect(): Promise<boolean>;
  disconnect(): void;
  fetchOptionsChain(ticker: string): Promise<OptionsChain>;
  getHealth(): ProviderHealth;
  testConnection(): Promise<boolean>;
}

export interface ProviderManagerState {
  providers: ProviderConfig[];
  healthMap: Record<string, ProviderHealth>;
  activeProviderId: string | null;
  isFailoverActive: boolean;
  lastFailoverTime: number | null;
}

export type ProviderAction =
  | { type: 'ADD_PROVIDER'; payload: ProviderConfig }
  | { type: 'REMOVE_PROVIDER'; payload: string }
  | { type: 'UPDATE_PROVIDER'; payload: { id: string; changes: Partial<ProviderConfig> } }
  | { type: 'SET_HEALTH'; payload: ProviderHealth }
  | { type: 'SET_ACTIVE'; payload: string }
  | { type: 'FAILOVER'; payload: { fromId: string; toId: string } }
  | { type: 'RESET_FAILOVER' }
  | { type: 'REORDER'; payload: ProviderConfig[] };

/** Default Yahoo provider config used when no providers are stored */
export const DEFAULT_YAHOO_CONFIG: ProviderConfig = {
  id: 'yahoo-default',
  type: 'yahoo',
  name: 'Yahoo Finance',
  enabled: true,
  priority: 0,
  rateLimitPerMinute: 100,
  timeoutMs: 10_000,
};

/** Create a blank ProviderHealth for a given provider id */
export function createDefaultHealth(providerId: string): ProviderHealth {
  return {
    providerId,
    status: 'inactive',
    latencyMs: null,
    lastChecked: null,
    errorMessage: null,
    successRate: 100,
  };
}
