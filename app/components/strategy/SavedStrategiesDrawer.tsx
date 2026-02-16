'use client';

import React, { useState } from 'react';
import { useStrategyContext } from './StrategyContext';
import styles from '../../styles/strategy.module.css';

/**
 * Sidebar/collapsible section showing saved strategies.
 * Allows loading and deleting previously saved configurations.
 */
export function SavedStrategiesDrawer() {
  const { state, loadStrategy, deleteStrategy } = useStrategyContext();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const handleDelete = (id: string) => {
    if (confirmId === id) {
      deleteStrategy(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const templateLabel: Record<string, string> = {
    'bull-call-spread': 'Bull Call',
    'bear-put-spread': 'Bear Put',
    'iron-condor': 'Iron Condor',
    'straddle': 'Straddle',
    'custom': 'Custom',
  };

  return (
    <div className={styles.savedDrawer}>
      <button
        type="button"
        className={styles.drawerToggle}
        onClick={() => setIsOpen(!isOpen)}
      >
        Saved Strategies ({state.savedStrategies.length})
        <span className={isOpen ? styles.chevronOpen : styles.chevronClosed}>▾</span>
      </button>

      {isOpen && (
        <div className={styles.drawerContent}>
          {state.savedStrategies.length === 0 ? (
            <p className={styles.drawerEmpty}>No saved strategies</p>
          ) : (
            <ul className={styles.savedList}>
              {state.savedStrategies.map((s) => (
                <li key={s.id} className={styles.savedItem}>
                  <div className={styles.savedInfo}>
                    <span className={styles.savedName}>{s.name}</span>
                    <span className={styles.savedMeta}>
                      {templateLabel[s.template] ?? s.template} · {s.ticker} · {formatDate(s.createdAt)}
                    </span>
                  </div>
                  <div className={styles.savedActions}>
                    <button
                      type="button"
                      className={styles.btnSmall}
                      onClick={() => loadStrategy(s)}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      className={`${styles.btnSmall} ${styles.btnDanger}`}
                      onClick={() => handleDelete(s.id)}
                    >
                      {confirmId === s.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
