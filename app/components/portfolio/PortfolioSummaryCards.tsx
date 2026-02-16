'use client';

import React from 'react';
import { usePortfolioContext } from './PortfolioContext';
import styles from '../../styles/portfolio.module.css';

/** Format a number as USD currency */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format a number with sign and 2 decimal places */
function formatGreek(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

interface SummaryCardProps {
  label: string;
  value: string;
  accent: string;
  subtitle?: string;
}

function SummaryCard({ label, value, accent, subtitle }: SummaryCardProps) {
  return (
    <div className={styles.summaryCard} style={{ borderTopColor: accent }}>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardValue} style={{ color: accent }}>{value}</span>
      {subtitle && <span className={styles.cardSubtitle}>{subtitle}</span>}
    </div>
  );
}

/**
 * Dashboard cards showing portfolio-level Greeks, P&L, positions count, and value.
 * 4-column grid on desktop, 2-column on mobile.
 */
export function PortfolioSummaryCards() {
  const { state } = usePortfolioContext();
  const { summary, isLoading } = state;

  if (isLoading) {
    return (
      <div className={styles.summaryGrid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`${styles.summaryCard} ${styles.skeleton}`}>
            <span className={styles.cardLabel}>&nbsp;</span>
            <span className={styles.cardValue}>&nbsp;</span>
          </div>
        ))}
      </div>
    );
  }

  const pnlColor = summary.totalPnL >= 0 ? '#66bb6a' : '#ef5350';
  const pnlSign = summary.totalPnL >= 0 ? '+' : '';

  return (
    <div className={styles.summaryGrid}>
      <SummaryCard
        label="Delta"
        value={formatGreek(summary.greeks.totalDelta)}
        accent="#64b5f6"
      />
      <SummaryCard
        label="Gamma"
        value={formatGreek(summary.greeks.totalGamma)}
        accent="#ba68c8"
      />
      <SummaryCard
        label="Theta"
        value={formatGreek(summary.greeks.totalTheta)}
        accent="#ffb74d"
      />
      <SummaryCard
        label="Vega"
        value={formatGreek(summary.greeks.totalVega)}
        accent="#4dd0e1"
      />
      <SummaryCard
        label="Total P&L"
        value={`${pnlSign}${formatCurrency(summary.totalPnL)}`}
        accent={pnlColor}
        subtitle={`${pnlSign}${summary.pnlPercent.toFixed(2)}%`}
      />
      <SummaryCard
        label="Positions"
        value={String(summary.totalPositions)}
        accent="#e2e8f0"
      />
      <SummaryCard
        label="Total Value"
        value={formatCurrency(summary.totalValue)}
        accent="#e2e8f0"
      />
      <SummaryCard
        label="Cost Basis"
        value={formatCurrency(summary.totalCostBasis)}
        accent="#94a3b8"
      />
    </div>
  );
}
