// Provider Factory — creates IDataProvider instances from config (Issue #4)
// Only Yahoo is a real implementation; Polygon/Tradier/Custom are stubs.

import type { OptionsChain } from '../types/yahoo-finance';
import type {
  IDataProvider,
  ProviderConfig,
  ProviderHealth,
  ProviderStatus,
} from '../types/data-provider';

const DEFAULT_API_BASE = 'https://options-scanner-backend-2exk6s.azurewebsites.net';

// ─── Yahoo Provider ─────────────────────────────────────────────────────────

class YahooProvider implements IDataProvider {
  readonly config: ProviderConfig;
  private status: ProviderStatus = 'inactive';
  private latencyMs: number | null = null;
  private lastChecked: number | null = null;
  private errorMessage: string | null = null;
  private totalRequests = 0;
  private successfulRequests = 0;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    this.status = 'connecting';
    const ok = await this.testConnection();
    this.status = ok ? 'active' : 'error';
    return ok;
  }

  disconnect(): void {
    this.status = 'inactive';
  }

  async fetchOptionsChain(ticker: string): Promise<OptionsChain> {
    const base = this.config.baseUrl || DEFAULT_API_BASE;
    const url = `${base}/api/options-chain/${encodeURIComponent(ticker)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    this.totalRequests++;
    const start = performance.now();

    try {
      const res = await fetch(url, { signal: controller.signal });
      this.latencyMs = Math.round(performance.now() - start);
      this.lastChecked = Date.now();

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      this.successfulRequests++;
      this.status = 'active';
      this.errorMessage = null;
      return json as OptionsChain;
    } catch (err: unknown) {
      this.errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.status = 'error';
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  getHealth(): ProviderHealth {
    const rate =
      this.totalRequests > 0
        ? Math.round((this.successfulRequests / this.totalRequests) * 100)
        : 100;
    return {
      providerId: this.config.id,
      status: this.status,
      latencyMs: this.latencyMs,
      lastChecked: this.lastChecked,
      errorMessage: this.errorMessage,
      successRate: rate,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const base = this.config.baseUrl || DEFAULT_API_BASE;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      const start = performance.now();

      const res = await fetch(`${base}/api/health`, { signal: controller.signal });
      clearTimeout(timer);

      this.latencyMs = Math.round(performance.now() - start);
      this.lastChecked = Date.now();
      this.errorMessage = null;
      return res.ok;
    } catch (err: unknown) {
      this.errorMessage = err instanceof Error ? err.message : 'Connection failed';
      this.lastChecked = Date.now();
      return false;
    }
  }
}

// ─── Stub Provider (Polygon / Tradier / Custom) ─────────────────────────────

class StubProvider implements IDataProvider {
  readonly config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    return false;
  }

  disconnect(): void {
    /* no-op */
  }

  async fetchOptionsChain(_ticker: string): Promise<OptionsChain> {
    throw new Error(`${this.config.type} provider is not yet implemented`);
  }

  getHealth(): ProviderHealth {
    return {
      providerId: this.config.id,
      status: 'inactive',
      latencyMs: null,
      lastChecked: null,
      errorMessage: `${this.config.type} provider is not yet implemented`,
      successRate: 0,
    };
  }

  async testConnection(): Promise<boolean> {
    return false;
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createProvider(config: ProviderConfig): IDataProvider {
  switch (config.type) {
    case 'yahoo':
      return new YahooProvider(config);
    case 'polygon':
    case 'tradier':
    case 'custom':
    default:
      return new StubProvider(config);
  }
}
