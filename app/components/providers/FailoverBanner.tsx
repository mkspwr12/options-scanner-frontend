'use client';

import React from 'react';
import styles from '../../styles/providers.module.css';

// ─── Props ──────────────────────────────────────────────────────────────────

interface FailoverBannerProps {
  isActive: boolean;
  fromName?: string;
  toName?: string;
  onReset: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FailoverBanner({
  isActive,
  fromName,
  toName,
  onReset,
}: FailoverBannerProps) {
  if (!isActive) return null;

  return (
    <div className={styles.failoverBanner}>
      <span className={styles.failoverText}>
        ⚠️ Failover active: switched from <strong>{fromName ?? 'primary'}</strong> to{' '}
        <strong>{toName ?? 'secondary'}</strong>
      </span>
      <button className={styles.failoverReset} onClick={onReset}>
        Reset
      </button>
    </div>
  );
}
