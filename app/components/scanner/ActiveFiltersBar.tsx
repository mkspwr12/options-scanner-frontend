'use client';

import React from 'react';
import { useFilter } from './FilterContext';
import { FilterChip } from '../primitives/FilterChip';
import { DEFAULT_FILTERS } from '../../utils/filterDefaults';
import type { FilterState } from '../../types/scanner';
import styles from '../../styles/scanner.module.css';

interface ActiveFilter {
  key: keyof FilterState;
  label: string;
}

/**
 * Dismissible filter chips showing what's active + "Clear All" button.
 * See SPEC-2.md Section 2.4 (ActiveFiltersBar).
 */
export function ActiveFiltersBar() {
  const { state, dispatch } = useFilter();
  const { filters } = state;
  const d = DEFAULT_FILTERS;

  const activeFilters: ActiveFilter[] = [];

  if (filters.ivPercentile[0] !== d.ivPercentile[0] || filters.ivPercentile[1] !== d.ivPercentile[1]) {
    activeFilters.push({ key: 'ivPercentile', label: `IV: ${filters.ivPercentile[0]}-${filters.ivPercentile[1]}%` });
  }
  if (JSON.stringify(filters.dte) !== JSON.stringify(d.dte)) {
    if (Array.isArray(filters.dte)) {
      activeFilters.push({ key: 'dte', label: `DTE: ${filters.dte[0]}-${filters.dte[1]}d` });
    }
  }
  if (filters.volumeOIRatio[0] !== d.volumeOIRatio[0] || filters.volumeOIRatio[1] !== d.volumeOIRatio[1]) {
    activeFilters.push({ key: 'volumeOIRatio', label: `Vol/OI: ${filters.volumeOIRatio[0].toFixed(1)}-${filters.volumeOIRatio[1].toFixed(1)}×` });
  }
  if (filters.delta[0] !== d.delta[0] || filters.delta[1] !== d.delta[1]) {
    activeFilters.push({ key: 'delta', label: `Δ: ${filters.delta[0].toFixed(2)} to ${filters.delta[1].toFixed(2)}` });
  }
  if (filters.theta[0] !== d.theta[0] || filters.theta[1] !== d.theta[1]) {
    activeFilters.push({ key: 'theta', label: `Θ: ${filters.theta[0].toFixed(2)} to ${filters.theta[1].toFixed(2)}` });
  }
  if (filters.vega[0] !== d.vega[0] || filters.vega[1] !== d.vega[1]) {
    activeFilters.push({ key: 'vega', label: `Vega: ${filters.vega[0].toFixed(2)}-${filters.vega[1].toFixed(2)}` });
  }
  if (filters.optionType !== 'all') {
    activeFilters.push({ key: 'optionType', label: `Type: ${filters.optionType}` });
  }
  if (filters.moneyness !== 'all') {
    activeFilters.push({ key: 'moneyness', label: `Moneyness: ${filters.moneyness.toUpperCase()}` });
  }
  if (filters.minVolume !== null && filters.minVolume > 0) {
    activeFilters.push({ key: 'minVolume', label: `Min Vol: ${filters.minVolume}` });
  }

  if (activeFilters.length === 0) return null;

  const removeFilter = (key: keyof FilterState) => {
    const reset: Partial<FilterState> = {};
    reset[key] = d[key] as never;
    dispatch({ type: 'SET_FILTER', payload: reset });
  };

  return (
    <div className={styles.activeFiltersBar} role="status" aria-label="Active filters">
      <div className={styles.activeFiltersChips}>
        {activeFilters.map(({ key, label }) => (
          <FilterChip
            key={key}
            label={label}
            dismissible
            onDismiss={() => removeFilter(key)}
          />
        ))}
      </div>
      <button
        type="button"
        className={styles.clearAllButton}
        onClick={() => dispatch({ type: 'RESET_FILTERS' })}
        aria-label="Clear all filters"
      >
        Clear All
      </button>
    </div>
  );
}
