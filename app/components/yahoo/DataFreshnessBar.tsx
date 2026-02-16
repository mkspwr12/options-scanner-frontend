'use client';

import React from 'react';
import styles from '../../styles/yahoo.module.css';

interface DataFreshnessBarProps {
  lastFetchTime: number | null;
  autoRefresh: boolean;
  refreshIntervalMs: number;
  onRefresh: () => void;
  onToggleAutoRefresh: (enabled: boolean) => void;
  onChangeInterval: (ms: number) => void;
}

const INTERVAL_OPTIONS = [
  { label: '30s', value: 30_000 },
  { label: '60s', value: 60_000 },
  { label: '120s', value: 120_000 },
] as const;

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const seconds = Math.floor(diffMs / 1_000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function DataFreshnessBar({
  lastFetchTime,
  autoRefresh,
  refreshIntervalMs,
  onRefresh,
  onToggleAutoRefresh,
  onChangeInterval,
}: DataFreshnessBarProps) {
  return (
    <div className={styles.freshnessBar}>
      <span className={styles.freshnessLabel}>
        {lastFetchTime ? `Last updated: ${formatRelativeTime(lastFetchTime)}` : 'No data loaded'}
      </span>

      <div className={styles.freshnessControls}>
        <label className={styles.autoRefreshLabel}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => onToggleAutoRefresh(e.target.checked)}
          />
          Auto-refresh
        </label>

        <div className={styles.intervalButtons}>
          {INTERVAL_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className={`${styles.intervalBtn} ${refreshIntervalMs === value ? styles.intervalBtnActive : ''}`}
              onClick={() => onChangeInterval(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <button type="button" className={styles.refreshBtn} onClick={onRefresh}>
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}
