'use client';

import React from 'react';
import { usePortfolioContext } from './PortfolioContext';
import styles from '../../styles/portfolio.module.css';

const SEVERITY_CLASSES: Record<string, string> = {
  critical: styles.alertCritical,
  warning: styles.alertWarning,
  info: styles.alertInfo,
};

/**
 * Displays active risk alerts as dismissible banners.
 * Critical = red, Warning = yellow, Info = blue.
 * Hidden when no unacknowledged alerts exist.
 */
export function RiskAlertBanner() {
  const { state, acknowledgeAlert, clearAlerts } = usePortfolioContext();
  const activeAlerts = state.alerts.filter((a) => !a.acknowledged);

  if (activeAlerts.length === 0) return null;

  return (
    <div className={styles.alertContainer}>
      <div className={styles.alertHeader}>
        <span className={styles.alertHeaderText}>
          ⚠ {activeAlerts.length} Risk Alert{activeAlerts.length > 1 ? 's' : ''}
        </span>
        <button type="button" className={styles.clearAlertsBtn} onClick={clearAlerts}>
          Clear All
        </button>
      </div>
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`${styles.alertBanner} ${SEVERITY_CLASSES[alert.severity] ?? ''}`}
        >
          <div className={styles.alertContent}>
            <span className={styles.alertMessage}>{alert.message}</span>
            <span className={styles.alertTime}>
              {new Date(alert.triggeredAt).toLocaleTimeString()}
            </span>
          </div>
          <button
            type="button"
            className={styles.alertDismiss}
            onClick={() => acknowledgeAlert(alert.id)}
            title="Acknowledge"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
