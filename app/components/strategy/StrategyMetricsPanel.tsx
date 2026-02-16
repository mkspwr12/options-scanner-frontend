'use client';

import React, { useMemo } from 'react';
import { useStrategyContext } from './StrategyContext';
import { calculateMetrics } from '../../utils/blackScholes';
import styles from '../../styles/strategy.module.css';

/**
 * Displays computed strategy metrics alongside the payoff chart.
 */
export function StrategyMetricsPanel() {
  const { state } = useStrategyContext();

  const metrics = useMemo(() => {
    if (state.legs.length === 0) return null;
    return calculateMetrics(state.legs, state.underlyingPrice);
  }, [state.legs, state.underlyingPrice]);

  if (!metrics) {
    return (
      <div className={styles.metricsPanel}>
        <p className={styles.metricsEmpty}>Add legs to see metrics</p>
      </div>
    );
  }

  const formatValue = (v: number | 'unlimited') =>
    v === 'unlimited' ? 'Unlimited' : `$${v.toFixed(2)}`;

  return (
    <div className={styles.metricsPanel}>
      <h4 className={styles.metricsPanelTitle}>Strategy Metrics</h4>

      <div className={styles.metricsGrid}>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Max Profit</span>
          <span className={styles.metricValueGreen}>{formatValue(metrics.maxProfit)}</span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Max Loss</span>
          <span className={styles.metricValueRed}>{formatValue(metrics.maxLoss)}</span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Net Debit/Credit</span>
          <span className={metrics.netDebit >= 0 ? styles.metricValueRed : styles.metricValueGreen}>
            {metrics.netDebit >= 0 ? `Debit $${metrics.netDebit.toFixed(2)}` : `Credit $${Math.abs(metrics.netDebit).toFixed(2)}`}
          </span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Total Premium</span>
          <span className={styles.metricValue}>${metrics.totalPremium.toFixed(2)}</span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Break-Even</span>
          <span className={styles.metricValue}>
            {metrics.breakEvenPoints.length === 0
              ? '—'
              : metrics.breakEvenPoints.map((p) => `$${p.toFixed(2)}`).join(', ')}
          </span>
        </div>
      </div>
    </div>
  );
}
