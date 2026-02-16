'use client';

import React, { useState, useMemo } from 'react';
import type { OptionContract } from '../../types/yahoo-finance';
import styles from '../../styles/yahoo.module.css';

interface OptionsChainTableProps {
  contracts: OptionContract[];
  isLoading: boolean;
}

type SortField = keyof Pick<
  OptionContract,
  'strike' | 'bid' | 'ask' | 'last' | 'volume' | 'openInterest' | 'impliedVolatility' | 'delta' | 'gamma' | 'theta' | 'vega'
>;

interface SortConfig {
  field: SortField;
  direction: 'asc' | 'desc';
}

const COLUMNS: { field: SortField; label: string; tooltip?: string }[] = [
  { field: 'strike', label: 'Strike' },
  { field: 'bid', label: 'Bid' },
  { field: 'ask', label: 'Ask' },
  { field: 'last', label: 'Last' },
  { field: 'volume', label: 'Volume' },
  { field: 'openInterest', label: 'OI' },
  { field: 'impliedVolatility', label: 'IV%' },
  { field: 'delta', label: 'Delta', tooltip: 'Rate of change of option price per $1 change in underlying' },
  { field: 'gamma', label: 'Gamma', tooltip: 'Rate of change of delta per $1 change in underlying' },
  { field: 'theta', label: 'Theta', tooltip: 'Daily time decay of the option premium' },
  { field: 'vega', label: 'Vega', tooltip: 'Sensitivity of option price to 1% change in IV' },
];

const SKELETON_ROWS = 8;

export default function OptionsChainTable({ contracts, isLoading }: OptionsChainTableProps) {
  const [sort, setSort] = useState<SortConfig>({ field: 'strike', direction: 'asc' });

  const handleSort = (field: SortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'asc' },
    );
  };

  const sorted = useMemo(() => {
    if (contracts.length === 0) return [];
    return [...contracts].sort((a, b) => {
      const aVal = a[sort.field];
      const bVal = b[sort.field];
      return sort.direction === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [contracts, sort]);

  return (
    <div className={styles.chainTableWrapper}>
      <table className={styles.chainTable}>
        <thead>
          <tr>
            <th className={styles.chainTh}>Type</th>
            {COLUMNS.map(({ field, label, tooltip }) => (
              <th
                key={field}
                className={`${styles.chainTh} ${styles.sortable}`}
                onClick={() => handleSort(field)}
                title={tooltip}
              >
                {label}
                {sort.field === field && (
                  <span className={styles.sortArrow}>
                    {sort.direction === 'asc' ? ' ▲' : ' ▼'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={`skel-${i}`} className={styles.skeletonRow}>
                  <td className={styles.chainTd}>
                    <span className={styles.skeleton} />
                  </td>
                  {COLUMNS.map(({ field }) => (
                    <td key={field} className={styles.chainTd}>
                      <span className={styles.skeleton} />
                    </td>
                  ))}
                </tr>
              ))
            : sorted.map((c) => (
                <tr key={c.contractSymbol} className={styles.chainRow}>
                  <td className={styles.chainTd}>
                    <span
                      className={
                        c.optionType === 'call' ? styles.callBadge : styles.putBadge
                      }
                    >
                      {c.optionType.toUpperCase()}
                    </span>
                  </td>
                  <td className={styles.chainTd}>{c.strike.toFixed(2)}</td>
                  <td className={styles.chainTd}>{c.bid.toFixed(2)}</td>
                  <td className={styles.chainTd}>{c.ask.toFixed(2)}</td>
                  <td className={styles.chainTd}>{c.last.toFixed(2)}</td>
                  <td className={styles.chainTd}>{c.volume.toLocaleString()}</td>
                  <td className={styles.chainTd}>{c.openInterest.toLocaleString()}</td>
                  <td className={styles.chainTd}>{(c.impliedVolatility * 100).toFixed(1)}%</td>
                  <td
                    className={styles.chainTd}
                    style={{ color: c.delta >= 0 ? '#66bb6a' : '#ef5350' }}
                  >
                    {c.delta.toFixed(4)}
                  </td>
                  <td className={styles.chainTd}>{c.gamma.toFixed(4)}</td>
                  <td className={styles.chainTd}>{c.theta.toFixed(4)}</td>
                  <td className={styles.chainTd}>{c.vega.toFixed(4)}</td>
                </tr>
              ))}
        </tbody>
      </table>
      {!isLoading && sorted.length === 0 && (
        <p className={styles.emptyMessage}>No contracts to display. Enter a ticker above.</p>
      )}
    </div>
  );
}
