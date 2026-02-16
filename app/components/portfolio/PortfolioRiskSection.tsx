'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PortfolioProvider, usePortfolioContext } from './PortfolioContext';
import { PortfolioSummaryCards } from './PortfolioSummaryCards';
import { PositionsTable } from './PositionsTable';
import { RiskAlertBanner } from './RiskAlertBanner';
import { RiskThresholdConfig } from './RiskThresholdConfig';
import { StrategyGroupView } from './StrategyGroupView';
import styles from '../../styles/portfolio.module.css';

type Tab = 'positions' | 'groups' | 'settings';

const TABS: { key: Tab; label: string }[] = [
  { key: 'positions', label: 'Positions' },
  { key: 'groups', label: 'Strategy Groups' },
  { key: 'settings', label: 'Risk Settings' },
];

const AUTO_REFRESH_MS = 60_000;

/**
 * Inner content — needs PortfolioProvider above it.
 */
function PortfolioRiskInner() {
  const { state, refetch } = usePortfolioContext();
  const [activeTab, setActiveTab] = useState<Tab>('positions');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void refetch();
    }, AUTO_REFRESH_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refetch]);

  return (
    <div className={styles.section}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Portfolio Risk</h2>
        <button type="button" className={styles.refreshBtn} onClick={() => void refetch()}>
          ↻ Refresh
        </button>
      </div>

      {/* Error state */}
      {state.error && (
        <div className={styles.errorBanner}>
          <span>⚠ {state.error}</span>
          <button type="button" className={styles.retryBtn} onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      )}

      {/* Risk alerts */}
      <RiskAlertBanner />

      {/* Summary dashboard */}
      <PortfolioSummaryCards />

      {/* Tab navigation */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === 'positions' && <PositionsTable />}
        {activeTab === 'groups' && <StrategyGroupView />}
        {activeTab === 'settings' && <RiskThresholdConfig />}
      </div>
    </div>
  );
}

/**
 * Main composition component for the Portfolio Risk Management feature.
 * Wraps everything in PortfolioProvider.
 */
export function PortfolioRiskSection() {
  return (
    <PortfolioProvider>
      <PortfolioRiskInner />
    </PortfolioProvider>
  );
}
