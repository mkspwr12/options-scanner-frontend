'use client';

import React, { useState, useCallback } from 'react';
import { useOptionsChain } from '../../hooks/useOptionsChain';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import ConnectionStatusBadge from './ConnectionStatusBadge';
import DataFreshnessBar from './DataFreshnessBar';
import StaleDataBanner from './StaleDataBanner';
import RateLimitIndicator from './RateLimitIndicator';
import OptionsChainTable from './OptionsChainTable';
import styles from '../../styles/yahoo.module.css';

const STALE_THRESHOLD_MS = 5 * 60 * 1_000; // 5 minutes

export default function YahooDataSection() {
  const [tickerInput, setTickerInput] = useState('');
  const [activeTicker, setActiveTicker] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(60_000);
  const [staleDismissed, setStaleDismissed] = useState(false);

  const { chain, isLoading, error, connectionState, rateLimit, refetch } =
    useOptionsChain(activeTicker, refreshIntervalMs);

  const handleRefresh = useCallback(() => {
    setStaleDismissed(false);
    refetch();
  }, [refetch]);

  useAutoRefresh(handleRefresh, refreshIntervalMs, autoRefresh && activeTicker.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tickerInput.trim().toUpperCase();
    if (trimmed) {
      setStaleDismissed(false);
      setActiveTicker(trimmed);
    }
  };

  const isStale =
    chain?.lastUpdated != null && Date.now() - chain.lastUpdated > STALE_THRESHOLD_MS;

  return (
    <section className={styles.section}>
      <form className={styles.tickerForm} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.tickerInput}
          placeholder="Enter ticker (e.g. AAPL)"
          value={tickerInput}
          onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
          aria-label="Ticker symbol"
        />
        <button type="submit" className={styles.tickerSubmit} disabled={!tickerInput.trim()}>
          Load Chain
        </button>
      </form>

      <div className={styles.headerRow}>
        <ConnectionStatusBadge state={connectionState} />
        <DataFreshnessBar
          lastFetchTime={chain?.lastUpdated ?? null}
          autoRefresh={autoRefresh}
          refreshIntervalMs={refreshIntervalMs}
          onRefresh={handleRefresh}
          onToggleAutoRefresh={setAutoRefresh}
          onChangeInterval={setRefreshIntervalMs}
        />
      </div>

      {isStale && !staleDismissed && (
        <StaleDataBanner onRefresh={handleRefresh} onDismiss={() => setStaleDismissed(true)} />
      )}

      {error && <p className={styles.errorText}>{error}</p>}

      <RateLimitIndicator
        requestsUsed={rateLimit.requestsUsed}
        requestsLimit={rateLimit.requestsLimit}
      />

      {activeTicker && chain && (
        <h3 className={styles.chainTitle}>
          {chain.ticker} — ${chain.underlyingPrice.toFixed(2)}
        </h3>
      )}

      <OptionsChainTable contracts={chain?.contracts ?? []} isLoading={isLoading} />
    </section>
  );
}
