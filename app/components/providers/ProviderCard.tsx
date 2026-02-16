'use client';

import React from 'react';
import type { ProviderConfig, ProviderHealth, ProviderStatus } from '../../types/data-provider';
import ConnectionTestButton from './ConnectionTestButton';
import styles from '../../styles/providers.module.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  yahoo: '🟡',
  polygon: '🔵',
  tradier: '🟢',
  custom: '⚙️',
};

const STATUS_COLORS: Record<ProviderStatus, string> = {
  active: '#66bb6a',
  inactive: '#94a3b8',
  error: '#ef5350',
  connecting: '#ffa726',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProviderCardProps {
  config: ProviderConfig;
  health: ProviderHealth;
  isActive: boolean;
  isOnly: boolean; // true if this is the sole provider (disable Remove)
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (config: ProviderConfig) => void;
  onRemove: (id: string) => void;
  onTest: (id: string) => Promise<boolean>;
  onSetActive: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProviderCard({
  config,
  health,
  isActive,
  isOnly,
  onToggle,
  onEdit,
  onRemove,
  onTest,
  onSetActive,
  onMoveUp,
  onMoveDown,
}: ProviderCardProps) {
  const icon = TYPE_ICONS[config.type] ?? '⚙️';
  const statusColor = STATUS_COLORS[health.status];

  return (
    <div className={`${styles.card} ${isActive ? styles.cardActive : ''}`}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{icon}</span>
        <span className={styles.cardName}>{config.name}</span>
        <span
          className={styles.statusBadge}
          style={{ borderColor: statusColor, color: statusColor }}
        >
          {health.status}
        </span>
      </div>

      {/* Health bar */}
      <div className={styles.healthBarContainer}>
        <div className={styles.healthBarLabel}>
          Success rate: {health.successRate}%
        </div>
        <div className={styles.healthBarTrack}>
          <div
            className={styles.healthBarFill}
            style={{ width: `${health.successRate}%` }}
          />
        </div>
      </div>

      {/* Latency */}
      {health.latencyMs !== null && (
        <div className={styles.latency}>
          Latency: {health.latencyMs}ms
        </div>
      )}

      {/* Actions */}
      <div className={styles.cardActions}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={() => onToggle(config.id, !config.enabled)}
          />
          Enabled
        </label>

        {!isActive && config.enabled && (
          <button
            className={styles.actionButton}
            onClick={() => onSetActive(config.id)}
          >
            Set Active
          </button>
        )}

        <ConnectionTestButton providerId={config.id} onTest={onTest} />

        <button
          className={styles.actionButton}
          onClick={() => onEdit(config)}
        >
          Edit
        </button>

        <button
          className={styles.actionButtonDanger}
          disabled={isOnly}
          onClick={() => onRemove(config.id)}
          title={isOnly ? 'Cannot remove the only provider' : 'Remove provider'}
        >
          Remove
        </button>

        {/* Priority arrows */}
        <div className={styles.priorityArrows}>
          <button
            className={styles.arrowButton}
            onClick={() => onMoveUp(config.id)}
            title="Move up (higher priority)"
            aria-label="Move up"
          >
            ▲
          </button>
          <button
            className={styles.arrowButton}
            onClick={() => onMoveDown(config.id)}
            title="Move down (lower priority)"
            aria-label="Move down"
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}
