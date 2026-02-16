'use client';

import React from 'react';
import styles from '../../styles/yahoo.module.css';

interface RateLimitIndicatorProps {
  requestsUsed: number;
  requestsLimit: number;
}

function getBarColor(pct: number): string {
  if (pct >= 80) return '#ef5350';
  if (pct >= 50) return '#ffa726';
  return '#66bb6a';
}

export default function RateLimitIndicator({
  requestsUsed,
  requestsLimit,
}: RateLimitIndicatorProps) {
  const pct = requestsLimit > 0 ? (requestsUsed / requestsLimit) * 100 : 0;
  const color = getBarColor(pct);

  return (
    <div className={styles.rateLimitContainer}>
      <div className={styles.rateLimitHeader}>
        <span className={styles.rateLimitLabel}>API Usage</span>
        <span className={styles.rateLimitCount}>
          {requestsUsed} / {requestsLimit} requests this hour
        </span>
      </div>
      <div className={styles.rateLimitTrack}>
        <div
          className={styles.rateLimitFill}
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
