'use client';

import React from 'react';
import type { ScanResult } from '../../types/scanner';
import styles from '../../styles/scanner.module.css';

interface ResultsCardsProps {
  results: ScanResult[];
  onTrack?: (result: ScanResult) => void;
}

/**
 * Mobile card layout for scan results (<768px).
 * See SPEC-2.md Section 2.4 (ResultsCards mobile).
 */
export const ResultsCards = React.memo(function ResultsCards({
  results,
  onTrack,
}: ResultsCardsProps) {
  if (results.length === 0) {
    return (
      <div className={styles.resultsEmpty}>
        <p>No results match your current filters.</p>
        <p className={styles.resultsEmptyHint}>Try widening your filter ranges.</p>
      </div>
    );
  }

  return (
    <div className={styles.resultsCards}>
      {results.map((result) => {
        const key = `${result.symbol}-${result.strike}-${result.expiration}-${result.optionType}`;
        const isHighIV = result.ivPercentile > 60;
        const isUnusualVol = result.volumeOIRatio > 2;

        return (
          <div
            key={key}
            className={`${styles.resultCard} ${isHighIV ? styles.cardHighIV : ''} ${isUnusualVol ? styles.cardUnusualVol : ''}`}
          >
            <div className={styles.resultCardHeader}>
              <span className={styles.resultCardSymbol}>{result.symbol}</span>
              <span className={styles.resultCardType}>
                {result.optionType.toUpperCase()}
              </span>
            </div>

            <div className={styles.resultCardRow}>
              <span>Strike: ${result.strike.toFixed(2)}</span>
              <span>Exp: {result.expiration}</span>
            </div>

            <div className={styles.resultCardMetrics}>
              <div className={styles.resultCardMetric}>
                <span className={styles.resultCardMetricLabel}>IV%</span>
                <span className={isHighIV ? styles.metricHighIV : ''}>
                  {result.ivPercentile.toFixed(1)}%
                </span>
              </div>
              <div className={styles.resultCardMetric}>
                <span className={styles.resultCardMetricLabel}>Vol/OI</span>
                <span className={isUnusualVol ? styles.metricUnusualVol : ''}>
                  {result.volumeOIRatio.toFixed(2)}×
                </span>
              </div>
              <div className={styles.resultCardMetric}>
                <span className={styles.resultCardMetricLabel}>DTE</span>
                <span>{result.dte}</span>
              </div>
              <div className={styles.resultCardMetric}>
                <span className={styles.resultCardMetricLabel}>Delta</span>
                <span>{result.delta.toFixed(3)}</span>
              </div>
            </div>

            <div className={styles.resultCardPricing}>
              <span>Bid: ${result.bid.toFixed(2)}</span>
              <span>Ask: ${result.ask.toFixed(2)}</span>
              <span>Last: ${result.last.toFixed(2)}</span>
            </div>

            <button
              type="button"
              className={styles.trackButton}
              onClick={() => onTrack?.(result)}
              aria-label={`Track ${result.symbol} ${result.optionType}`}
            >
              Track
            </button>
          </div>
        );
      })}
    </div>
  );
});
