'use client';

import React, { useState } from 'react';
import { usePortfolioContext } from './PortfolioContext';
import type { RiskThreshold } from '../../types/portfolio';
import { uid } from '../../utils/uid';
import styles from '../../styles/portfolio.module.css';

const METRICS: RiskThreshold['metric'][] = ['delta', 'gamma', 'theta', 'vega', 'pnl'];
const OPERATORS: { value: RiskThreshold['operator']; label: string }[] = [
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
];

/**
 * Configuration panel for risk thresholds.
 * Lists existing thresholds with toggles, and an "Add Threshold" form.
 */
export function RiskThresholdConfig() {
  const { state, addThreshold, updateThreshold, removeThreshold } = usePortfolioContext();
  const { thresholds } = state;

  const [isAdding, setIsAdding] = useState(false);
  const [newMetric, setNewMetric] = useState<RiskThreshold['metric']>('delta');
  const [newOperator, setNewOperator] = useState<RiskThreshold['operator']>('gt');
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const handleAdd = () => {
    const val = parseFloat(newValue);
    if (isNaN(val) || !newLabel.trim()) return;

    addThreshold({
      id: uid(),
      metric: newMetric,
      operator: newOperator,
      value: val,
      enabled: true,
      label: newLabel.trim(),
    });

    setNewValue('');
    setNewLabel('');
    setIsAdding(false);
  };

  return (
    <div className={styles.thresholdSection}>
      <div className={styles.thresholdHeader}>
        <h3 className={styles.thresholdTitle}>Risk Thresholds</h3>
        <button
          type="button"
          className={styles.addThresholdBtn}
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? 'Cancel' : '+ Add Threshold'}
        </button>
      </div>

      {isAdding && (
        <div className={styles.thresholdForm}>
          <input
            type="text"
            className={styles.thresholdInput}
            placeholder="Label (e.g. Max Delta)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <select
            className={styles.thresholdSelect}
            value={newMetric}
            onChange={(e) => setNewMetric(e.target.value as RiskThreshold['metric'])}
          >
            {METRICS.map((m) => (
              <option key={m} value={m}>{m.toUpperCase()}</option>
            ))}
          </select>
          <select
            className={styles.thresholdSelect}
            value={newOperator}
            onChange={(e) => setNewOperator(e.target.value as RiskThreshold['operator'])}
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          <input
            type="number"
            className={styles.thresholdInput}
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <button type="button" className={styles.addThresholdConfirm} onClick={handleAdd}>
            Add
          </button>
        </div>
      )}

      <div className={styles.thresholdList}>
        {thresholds.map((t) => (
          <div key={t.id} className={styles.thresholdRow}>
            <label className={styles.thresholdToggle}>
              <input
                type="checkbox"
                checked={t.enabled}
                onChange={(e) => updateThreshold(t.id, { enabled: e.target.checked })}
              />
              <span className={styles.toggleSlider} />
            </label>
            <span className={styles.thresholdLabel}>{t.label}</span>
            <span className={styles.thresholdRule}>
              {t.metric.toUpperCase()}{' '}
              {OPERATORS.find((o) => o.value === t.operator)?.label ?? t.operator}{' '}
              {t.value}
            </span>
            <button
              type="button"
              className={styles.thresholdDelete}
              onClick={() => removeThreshold(t.id)}
              title="Delete threshold"
            >
              ✕
            </button>
          </div>
        ))}
        {thresholds.length === 0 && (
          <p className={styles.emptyText}>No thresholds configured. Add one above.</p>
        )}
      </div>
    </div>
  );
}
