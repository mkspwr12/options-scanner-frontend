'use client';

import React, { useState, useMemo } from 'react';
import { usePortfolioContext } from './PortfolioContext';
import type { Position } from '../../types/portfolio';
import styles from '../../styles/portfolio.module.css';

type SortKey = 'ticker' | 'strategyName' | 'costBasis' | 'currentValue' | 'pnl' | 'pnlPercent';
type SortDir = 'asc' | 'desc';

function calcPnlPercent(p: Position): number {
  return p.pnlPercent;
}

/**
 * Table of all portfolio positions.
 * Sortable columns, expandable leg rows, color-coded P&L.
 */
export function PositionsTable() {
  const { state, removePosition, setGroupBy } = usePortfolioContext();
  const { positions, groupBy, isLoading } = state;

  const [sortKey, setSortKey] = useState<SortKey>('ticker');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const list = [...positions];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'ticker': cmp = a.ticker.localeCompare(b.ticker); break;
        case 'strategyName': cmp = (a.strategyName || a.strategy).localeCompare(b.strategyName || b.strategy); break;
        case 'costBasis': cmp = a.costBasis - b.costBasis; break;
        case 'currentValue': cmp = a.currentValue - b.currentValue; break;
        case 'pnl': cmp = a.pnl - b.pnl; break;
        case 'pnlPercent': cmp = calcPnlPercent(a) - calcPnlPercent(b); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [positions, sortKey, sortDir]);

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={styles.tableWrap}>
        <table className={styles.positionsTable}>
          <thead>
            <tr>
              {['Ticker', 'Strategy', 'Legs', 'Cost Basis', 'Value', 'P&L', 'P&L%'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className={styles.skeleton}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <td key={j}><span className={styles.skeletonBar} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No positions in portfolio</p>
      </div>
    );
  }

  return (
    <div>
      {/* Group by toggle */}
      <div className={styles.groupByBar}>
        <span className={styles.groupByLabel}>Group by:</span>
        {(['none', 'ticker', 'strategy'] as const).map((g) => (
          <button
            key={g}
            type="button"
            className={`${styles.groupByBtn} ${groupBy === g ? styles.groupByBtnActive : ''}`}
            onClick={() => setGroupBy(g)}
          >
            {g === 'none' ? 'None' : g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.positionsTable}>
          <thead>
            <tr>
              <th onClick={() => handleSort('ticker')} className={styles.sortable}>Ticker{sortIndicator('ticker')}</th>
              <th onClick={() => handleSort('strategyName')} className={styles.sortable}>Strategy{sortIndicator('strategyName')}</th>
              <th>Legs</th>
              <th onClick={() => handleSort('costBasis')} className={styles.sortable}>Cost Basis{sortIndicator('costBasis')}</th>
              <th onClick={() => handleSort('currentValue')} className={styles.sortable}>Value{sortIndicator('currentValue')}</th>
              <th onClick={() => handleSort('pnl')} className={styles.sortable}>P&L{sortIndicator('pnl')}</th>
              <th onClick={() => handleSort('pnlPercent')} className={styles.sortable}>P&L%{sortIndicator('pnlPercent')}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((pos) => {
              const pnl = pos.pnl;
              const pnlPct = pnlPercent(pos);
              const pnlColor = pnl >= 0 ? '#66bb6a' : '#ef5350';
              const isExpanded = expandedId === pos.id;

              return (
                <React.Fragment key={pos.id}>
                  <tr
                    className={styles.positionRow}
                    onClick={() => setExpandedId(isExpanded ? null : pos.id)}
                  >
                    <td className={styles.tickerCell}>{pos.ticker}</td>
                    <td>{pos.strategyName}</td>
                    <td>{pos.legs.length}</td>
                    <td>${pos.costBasis.toLocaleString()}</td>
                    <td>${pos.currentValue.toLocaleString()}</td>
                    <td style={{ color: pnlColor }}>
                      {pnl >= 0 ? '+' : ''}${pnl.toLocaleString()}
                    </td>
                    <td style={{ color: pnlColor }}>
                      {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={(e) => { e.stopPropagation(); removePosition(pos.id); }}
                        title="Remove position"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className={styles.expandedRow}>
                      <td colSpan={8}>
                        <div className={styles.legsDetail}>
                          <strong>Legs:</strong>
                          <table className={styles.legsTable}>
                            <thead>
                              <tr>
                                <th>Type</th>
                                <th>Side</th>
                                <th>Strike</th>
                                <th>Exp</th>
                                <th>Qty</th>
                                <th>Premium</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pos.legs.map((leg) => (
                                <tr key={leg.id}>
                                  <td>{leg.optionType.toUpperCase()}</td>
                                  <td className={leg.side === 'buy' ? styles.buyText : styles.sellText}>
                                    {leg.side.toUpperCase()}
                                  </td>
                                  <td>${leg.strike}</td>
                                  <td>{leg.expiration}</td>
                                  <td>{leg.quantity}</td>
                                  <td>${leg.premium.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
