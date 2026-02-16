'use client';

import React from 'react';
import type { ConnectionState } from '../../types/yahoo-finance';
import styles from '../../styles/yahoo.module.css';

interface ConnectionStatusBadgeProps {
  state: ConnectionState;
}

const STATUS_CONFIG: Record<ConnectionState, { color: string; label: string }> = {
  connected: { color: '#66bb6a', label: 'Connected' },
  degraded: { color: '#ffa726', label: 'Degraded' },
  offline: { color: '#ef5350', label: 'Offline' },
};

export default function ConnectionStatusBadge({ state }: ConnectionStatusBadgeProps) {
  const { color, label } = STATUS_CONFIG[state];

  return (
    <span className={styles.connectionBadge}>
      <span
        className={styles.connectionDot}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
