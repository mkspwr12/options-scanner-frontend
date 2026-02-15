'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { FilterState } from '../../types/scanner';
import { DEFAULT_FILTERS } from '../../utils/filterDefaults';
import styles from '../../styles/scanner.module.css';

interface SavePresetModalProps {
  onSave: (name: string) => { ok: boolean; error?: string };
  onClose: () => void;
  currentFilters: FilterState;
}

/**
 * Modal for saving current filters as a named preset.
 * Shows filter summary, validates name (1-50 chars, unique).
 * See SPEC-2.md Section 4.3 (Preset name constraints).
 */
export function SavePresetModal({ onSave, onClose, currentFilters }: SavePresetModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError('Please enter a preset name.');
      return;
    }
    if (trimmed.length > 50) {
      setError('Preset name must be 50 characters or less.');
      return;
    }

    const result = onSave(trimmed);
    if (result.ok) {
      onClose();
    } else {
      setError(result.error ?? 'Failed to save preset.');
    }
  };

  // Build a human-readable summary of active filters
  const filterSummary: string[] = [];
  const d = DEFAULT_FILTERS;
  if (currentFilters.ivPercentile[0] !== d.ivPercentile[0] || currentFilters.ivPercentile[1] !== d.ivPercentile[1]) {
    filterSummary.push(`IV: ${currentFilters.ivPercentile[0]}-${currentFilters.ivPercentile[1]}%`);
  }
  if (JSON.stringify(currentFilters.dte) !== JSON.stringify(d.dte)) {
    const dte = currentFilters.dte;
    if (Array.isArray(dte)) filterSummary.push(`DTE: ${dte[0]}-${dte[1]}d`);
  }
  if (currentFilters.volumeOIRatio[0] !== d.volumeOIRatio[0] || currentFilters.volumeOIRatio[1] !== d.volumeOIRatio[1]) {
    filterSummary.push(`Vol/OI: ${currentFilters.volumeOIRatio[0].toFixed(1)}-${currentFilters.volumeOIRatio[1].toFixed(1)}×`);
  }
  if (currentFilters.delta[0] !== d.delta[0] || currentFilters.delta[1] !== d.delta[1]) {
    filterSummary.push(`Δ: ${currentFilters.delta[0].toFixed(2)} to ${currentFilters.delta[1].toFixed(2)}`);
  }
  if (currentFilters.optionType !== 'all') {
    filterSummary.push(`Type: ${currentFilters.optionType}`);
  }
  if (currentFilters.moneyness !== 'all') {
    filterSummary.push(`Moneyness: ${currentFilters.moneyness.toUpperCase()}`);
  }
  if (currentFilters.minVolume !== null && currentFilters.minVolume > 0) {
    filterSummary.push(`Min vol: ${currentFilters.minVolume}`);
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Save filter preset">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>Save Preset</h3>

        {filterSummary.length > 0 && (
          <div className={styles.modalFilterSummary}>
            <span className={styles.modalFilterSummaryLabel}>Active Filters:</span>
            <div className={styles.modalFilterSummaryChips}>
              {filterSummary.map((s, i) => (
                <span key={i} className={styles.modalChip}>{s}</span>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className={styles.modalInput}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="e.g., High IV + Short DTE"
            maxLength={50}
            aria-label="Preset name"
          />
          {error && <p className={styles.modalError}>{error}</p>}

          <div className={styles.modalActions}>
            <button type="button" className={styles.modalCancel} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.modalSave}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
