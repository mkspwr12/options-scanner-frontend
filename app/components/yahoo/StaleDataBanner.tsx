'use client';

import React from 'react';
import styles from '../../styles/yahoo.module.css';

interface StaleDataBannerProps {
  onRefresh: () => void;
  onDismiss: () => void;
}

export default function StaleDataBanner({ onRefresh, onDismiss }: StaleDataBannerProps) {
  return (
    <div className={styles.staleBanner} role="alert">
      <span className={styles.staleBannerIcon}>⚠</span>
      <span className={styles.staleBannerText}>
        Data may be stale — last update was more than 5 minutes ago.
      </span>
      <button type="button" className={styles.staleBannerRefresh} onClick={onRefresh}>
        Refresh Now
      </button>
      <button
        type="button"
        className={styles.staleBannerDismiss}
        onClick={onDismiss}
        aria-label="Dismiss stale data warning"
      >
        ✕
      </button>
    </div>
  );
}
