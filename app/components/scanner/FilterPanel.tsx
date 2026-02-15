'use client';

import React, { useState } from 'react';
import { useFilter } from './FilterContext';
import { FilterGroup } from './FilterGroup';
import { RangeSlider } from '../primitives/RangeSlider';
import { FilterChip } from '../primitives/FilterChip';
import { Select } from '../primitives/Select';
import { NumberInput } from '../primitives/NumberInput';
import { ResultCountBadge } from '../primitives/ResultCountBadge';
import { FILTER_RANGES, DTE_CHIP_VALUES, DEFAULT_FILTERS } from '../../utils/filterDefaults';
import type { FilterState } from '../../types/scanner';
import styles from '../../styles/scanner.module.css';

const OPTION_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'call', label: 'Calls' },
  { value: 'put', label: 'Puts' },
];

const MONEYNESS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'itm', label: 'In the Money' },
  { value: 'atm', label: 'At the Money' },
  { value: 'otm', label: 'Out of the Money' },
];

/**
 * Collapsible filter panel containing all filter groups.
 * See SPEC-2.md Section 2.4 (FilterPanel internals).
 */
export function FilterPanel() {
  const { state, dispatch } = useFilter();
  const { filters, filteredCount, isLoading } = state;
  const [isExpanded, setIsExpanded] = useState(true);

  const updateFilter = (partial: Partial<FilterState>) => {
    dispatch({ type: 'SET_FILTER', payload: partial });
  };

  const handleResetFilters = () => {
    dispatch({ type: 'RESET_FILTERS' });
  };

  // Check if DTE is using a chip value
  const activeDteChip = Array.isArray(filters.dte)
    ? DTE_CHIP_VALUES.find((d) => filters.dte[0] === 0 && filters.dte[1] === d)
    : null;

  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterPanelHeader}>
        <button
          type="button"
          className={styles.filterPanelToggle}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls="filter-panel-content"
        >
          <span className={styles.filterPanelToggleIcon}>
            {isExpanded ? '▼' : '▶'}
          </span>
          Filters
        </button>

        <div className={styles.filterPanelActions}>
          <ResultCountBadge count={filteredCount} isLoading={isLoading} />
          <button
            type="button"
            className={styles.resetButton}
            onClick={handleResetFilters}
            aria-label="Reset all filters"
          >
            Reset
          </button>
        </div>
      </div>

      {isExpanded && (
        <div id="filter-panel-content" className={styles.filterPanelContent}>
          {/* IV Percentile */}
          <FilterGroup
            label={FILTER_RANGES[0].label}
            tooltip={FILTER_RANGES[0].tooltip}
          >
            <RangeSlider
              label="IV Percentile"
              min={0}
              max={100}
              step={1}
              value={filters.ivPercentile}
              onChange={(v) => updateFilter({ ivPercentile: v })}
              unit="%"
            />
          </FilterGroup>

          {/* DTE - Chips + Range */}
          <FilterGroup label="Days to Expiration (DTE)">
            <div className={styles.chipGroup} role="listbox" aria-label="DTE quick select">
              {DTE_CHIP_VALUES.map((dteVal) => (
                <FilterChip
                  key={dteVal}
                  label={`≤${dteVal}d`}
                  selected={activeDteChip === dteVal}
                  onToggle={() => {
                    if (activeDteChip === dteVal) {
                      // Deselect — go back to full range
                      updateFilter({ dte: [0, 365] });
                    } else {
                      updateFilter({ dte: [0, dteVal] });
                    }
                  }}
                />
              ))}
            </div>
            {Array.isArray(filters.dte) && (
              <RangeSlider
                label="DTE"
                min={0}
                max={365}
                step={1}
                value={filters.dte as [number, number]}
                onChange={(v) => updateFilter({ dte: v })}
                unit="d"
              />
            )}
          </FilterGroup>

          {/* Volume/OI Ratio */}
          <FilterGroup
            label={FILTER_RANGES[1].label}
            tooltip={FILTER_RANGES[1].tooltip}
          >
            <RangeSlider
              label="Volume/OI"
              min={0.5}
              max={10}
              step={0.1}
              value={filters.volumeOIRatio}
              onChange={(v) => updateFilter({ volumeOIRatio: v })}
              unit="×"
              formatValue={(v) => `${v.toFixed(1)}×`}
            />
          </FilterGroup>

          {/* Delta */}
          <FilterGroup
            label={FILTER_RANGES[2].label}
            tooltip={FILTER_RANGES[2].tooltip}
          >
            <RangeSlider
              label="Delta"
              min={-1}
              max={1}
              step={0.05}
              value={filters.delta}
              onChange={(v) => updateFilter({ delta: v })}
              formatValue={(v) => v.toFixed(2)}
            />
          </FilterGroup>

          {/* Theta */}
          <FilterGroup label={FILTER_RANGES[3].label} tooltip={FILTER_RANGES[3].tooltip}>
            <RangeSlider
              label="Theta"
              min={-0.5}
              max={0}
              step={0.01}
              value={filters.theta}
              onChange={(v) => updateFilter({ theta: v })}
              unit="$/day"
              formatValue={(v) => `$${v.toFixed(2)}`}
            />
          </FilterGroup>

          {/* Vega */}
          <FilterGroup label={FILTER_RANGES[4].label} tooltip={FILTER_RANGES[4].tooltip}>
            <RangeSlider
              label="Vega"
              min={0}
              max={2}
              step={0.05}
              value={filters.vega}
              onChange={(v) => updateFilter({ vega: v })}
              formatValue={(v) => `$${v.toFixed(2)}`}
            />
          </FilterGroup>

          {/* Selects row */}
          <div className={styles.filterSelectRow}>
            <Select
              label="Option Type"
              value={filters.optionType}
              options={OPTION_TYPE_OPTIONS}
              onChange={(v) => updateFilter({ optionType: v as FilterState['optionType'] })}
            />
            <Select
              label="Moneyness"
              value={filters.moneyness}
              options={MONEYNESS_OPTIONS}
              onChange={(v) => updateFilter({ moneyness: v as FilterState['moneyness'] })}
            />
            <NumberInput
              label="Min Volume"
              value={filters.minVolume}
              onChange={(v) => updateFilter({ minVolume: v })}
              min={0}
              max={999999}
              step={1}
              placeholder="Any"
            />
          </div>
        </div>
      )}
    </div>
  );
}
