'use client';

import React, { useEffect } from 'react';
import { FilterProvider, useFilter } from './FilterContext';
import { PresetsBar } from './PresetsBar';
import { FilterPanel } from './FilterPanel';
import { ActiveFiltersBar } from './ActiveFiltersBar';
import { ResultsTable } from './ResultsTable';
import { ResultsCards } from './ResultsCards';
import { useScanFilters } from '../../hooks/useScanFilters';
import { useURLSync } from '../../hooks/useURLSync';
import type { ScanResult } from '../../types/scanner';
import styles from '../../styles/scanner.module.css';

interface ScannerSectionInnerProps {
  onTrack?: (result: ScanResult) => void;
}

/**
 * Inner scanner content — must be inside FilterProvider.
 * Wires up useScanFilters, useURLSync, and responsive layout.
 */
function ScannerSectionInner({ onTrack }: ScannerSectionInnerProps) {
  const { state, dispatch } = useFilter();
  const { filters, results, error, isLoading } = state;

  // Wire debounced API fetch
  useScanFilters(filters, dispatch);

  // Wire URL sync
  useURLSync(filters, dispatch);

  return (
    <div className={styles.scannerSection}>
      <PresetsBar />
      <FilterPanel />
      <ActiveFiltersBar />

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span>⚠ {error}</span>
        </div>
      )}

      {isLoading && results.length === 0 && (
        <div className={styles.loadingIndicator}>
          <span>Scanning...</span>
        </div>
      )}

      {/* Responsive results: table for desktop, cards for mobile */}
      <div className={styles.resultsDesktop}>
        <ResultsTable results={results} onTrack={onTrack} />
      </div>
      <div className={styles.resultsMobile}>
        <ResultsCards results={results} onTrack={onTrack} />
      </div>
    </div>
  );
}

interface ScannerSectionProps {
  onTrack?: (result: ScanResult) => void;
}

/**
 * Top-level scanner component — wraps everything in FilterProvider.
 * Drop this into page.tsx to replace the old scanner card.
 * See SPEC-2.md Section 2.4 (Component Tree).
 */
export function ScannerSection({ onTrack }: ScannerSectionProps) {
  return (
    <FilterProvider>
      <ScannerSectionInner onTrack={onTrack} />
    </FilterProvider>
  );
}
