'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { ScanResult, SortConfig } from '../../types/scanner';
import styles from '../../styles/scanner.module.css';

interface ResultsTableProps {
  results: ScanResult[];
  onTrack?: (result: ScanResult) => void;
}

const COLUMNS: { key: keyof ScanResult; label: string; align?: 'right' }[] = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'optionType', label: 'Type' },
  { key: 'strike', label: 'Strike', align: 'right' },
  { key: 'expiration', label: 'Exp' },
  { key: 'dte', label: 'DTE', align: 'right' },
  { key: 'ivPercentile', label: 'IV%', align: 'right' },
  { key: 'volume', label: 'Volume', align: 'right' },
  { key: 'volumeOIRatio', label: 'Vol/OI', align: 'right' },
  { key: 'delta', label: 'Delta', align: 'right' },
  { key: 'theta', label: 'Theta', align: 'right' },
  { key: 'bid', label: 'Bid', align: 'right' },
  { key: 'ask', label: 'Ask', align: 'right' },
  { key: 'last', label: 'Last', align: 'right' },
];

function formatCell(key: keyof ScanResult, value: unknown): string {
  if (value === null || value === undefined) return '—';
  switch (key) {
    case 'strike':
    case 'bid':
    case 'ask':
    case 'last':
    case 'underlyingPrice':
      return `$${Number(value).toFixed(2)}`;
    case 'ivPercentile':
      return `${Number(value).toFixed(1)}%`;
    case 'volumeOIRatio':
      return `${Number(value).toFixed(2)}×`;
    case 'delta':
    case 'theta':
    case 'vega':
    case 'gamma':
      return Number(value).toFixed(3);
    case 'volume':
    case 'openInterest':
      return Number(value).toLocaleString();
    case 'optionType':
      return String(value).toUpperCase();
    default:
      return String(value);
  }
}

/**
 * Desktop results table (≥1024px) with sortable columns and expandable rows.
 * See SPEC-2.md Section 2.4 + Section 7.2.
 */
export const ResultsTable = React.memo(function ResultsTable({
  results,
  onTrack,
}: ResultsTableProps) {
  const [sort, setSort] = useState<SortConfig>({ field: 'ivPercentile', direction: 'desc' });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = useCallback((field: keyof ScanResult) => {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'desc' },
    );
  }, []);

  const sortedResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      const aVal = a[sort.field];
      const bVal = b[sort.field];
      if (aVal === bVal) return 0;
      const cmp = aVal < bVal ? -1 : 1;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [results, sort]);

  const toggleExpand = (key: string) => {
    setExpandedRow((prev) => (prev === key ? null : key));
  };

  if (results.length === 0) {
    return (
      <div className={styles.resultsEmpty}>
        <p>No results match your current filters.</p>
        <p className={styles.resultsEmptyHint}>Try widening your filter ranges.</p>
      </div>
    );
  }

  return (
    <div className={styles.resultsTableWrapper}>
      <table className={styles.resultsTable} role="grid">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`${styles.resultsTableTh} ${col.align === 'right' ? styles.textRight : ''}`}
                onClick={() => handleSort(col.key)}
                role="columnheader"
                aria-sort={
                  sort.field === col.key
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSort(col.key);
                  }
                }}
              >
                {col.label}
                {sort.field === col.key && (
                  <span className={styles.sortIndicator}>
                    {sort.direction === 'asc' ? ' ▲' : ' ▼'}
                  </span>
                )}
              </th>
            ))}
            <th className={styles.resultsTableTh}>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedResults.map((result) => {
            const rowKey = `${result.symbol}-${result.strike}-${result.expiration}-${result.optionType}`;
            const isExpanded = expandedRow === rowKey;
            const isHighIV = result.ivPercentile > 60;
            const isUnusualVol = result.volumeOIRatio > 2;

            return (
              <React.Fragment key={rowKey}>
                <tr
                  className={`${styles.resultsTableRow} ${isHighIV ? styles.rowHighIV : ''} ${isUnusualVol ? styles.rowUnusualVol : ''}`}
                  onClick={() => toggleExpand(rowKey)}
                  role="row"
                  aria-expanded={isExpanded}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(rowKey);
                    }
                  }}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`${styles.resultsTableTd} ${col.align === 'right' ? styles.textRight : ''}`}
                    >
                      {formatCell(col.key, result[col.key])}
                    </td>
                  ))}
                  <td className={styles.resultsTableTd}>
                    <button
                      type="button"
                      className={styles.trackButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTrack?.(result);
                      }}
                      aria-label={`Track ${result.symbol} ${result.optionType}`}
                    >
                      Track
                    </button>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className={styles.expandedRow}>
                    <td colSpan={COLUMNS.length + 1}>
                      <div className={styles.expandedRowContent}>
                        <div className={styles.expandedDetail}>
                          <span className={styles.expandedLabel}>Underlying:</span>
                          <span>${result.underlyingPrice.toFixed(2)}</span>
                        </div>
                        <div className={styles.expandedDetail}>
                          <span className={styles.expandedLabel}>Open Interest:</span>
                          <span>{result.openInterest.toLocaleString()}</span>
                        </div>
                        <div className={styles.expandedDetail}>
                          <span className={styles.expandedLabel}>Gamma:</span>
                          <span>{result.gamma.toFixed(4)}</span>
                        </div>
                        <div className={styles.expandedDetail}>
                          <span className={styles.expandedLabel}>Vega:</span>
                          <span>{result.vega.toFixed(3)}</span>
                        </div>
                        <div className={styles.expandedDetail}>
                          <span className={styles.expandedLabel}>Spread:</span>
                          <span>${(result.ask - result.bid).toFixed(2)}</span>
                        </div>
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
  );
});
