'use client';

import React, { useState, useMemo } from 'react';
import { usePortfolioContext } from './PortfolioContext';
import { aggregateGreeks } from '../../utils/riskCalculations';
import type { Position } from '../../types/portfolio';
import styles from '../../styles/portfolio.module.css';

const STRATEGY_LABELS: Record<NonNullable<Position['strategyType']>, string> = {
  single: 'Single Leg',
  vertical: 'Vertical Spread',
  'iron-condor': 'Iron Condor',
  straddle: 'Straddle',
  strangle: 'Strangle',
  custom: 'Custom',
};

/**
 * Groups positions by detected strategy type.
 * Collapsible sections showing count and summary Greeks per group.
 */
export function StrategyGroupView() {
  const { state } = usePortfolioContext();
  const { positions } = state;

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, Position[]>();
    for (const pos of positions) {
      const strategyKey = pos.strategyType || pos.strategy || 'unknown';
      const list = map.get(strategyKey) ?? [];
      list.push(pos);
      map.set(strategyKey, list);
    }
    return map;
  }, [positions]);

  const toggleGroup = (type: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (positions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No positions to group</p>
      </div>
    );
  }

  return (
    <div className={styles.groupContainer}>
      {Array.from(groups.entries()).map(([type, groupPositions]) => {
        const isExpanded = expandedGroups.has(type);
        const greeks = aggregateGreeks(groupPositions);
        const totalPnL = groupPositions.reduce((s, p) => s + p.pnl, 0);
        const pnlColor = totalPnL >= 0 ? '#66bb6a' : '#ef5350';

        return (
          <div key={type} className={styles.groupSection}>
            <button
              type="button"
              className={styles.groupHeader}
              onClick={() => toggleGroup(type)}
            >
              <span className={styles.groupChevron}>{isExpanded ? '▾' : '▸'}</span>
              <span className={styles.groupName}>{STRATEGY_LABELS[type]}</span>
              <span className={styles.groupCount}>{groupPositions.length} position{groupPositions.length > 1 ? 's' : ''}</span>
              <span className={styles.groupPnL} style={{ color: pnlColor }}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}
              </span>
            </button>
            {isExpanded && (
              <div className={styles.groupBody}>
                <div className={styles.groupGreeks}>
                  <span>Δ {greeks.totalDelta.toFixed(2)}</span>
                  <span>Γ {greeks.totalGamma.toFixed(2)}</span>
                  <span>Θ {greeks.totalTheta.toFixed(2)}</span>
                  <span>V {greeks.totalVega.toFixed(2)}</span>
                </div>
                <ul className={styles.groupPositionsList}>
                  {groupPositions.map((pos) => (
                    <li key={pos.id} className={styles.groupPositionItem}>
                      <span className={styles.groupPositionTicker}>{pos.ticker}</span>
                      <span>{pos.strategyName}</span>
                      <span style={{ color: pos.pnl >= 0 ? '#66bb6a' : '#ef5350' }}>
                        {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
