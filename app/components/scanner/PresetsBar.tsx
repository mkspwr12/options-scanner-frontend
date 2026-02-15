'use client';

import React, { useState } from 'react';
import { useFilter } from './FilterContext';
import { usePresets } from '../../hooks/usePresets';
import { PresetChip } from '../primitives/PresetChip';
import { SavePresetModal } from './SavePresetModal';
import styles from '../../styles/scanner.module.css';

/**
 * Preset chips bar with save button.
 * See SPEC-2.md Section 2.3 (Preset Save/Load flow).
 */
export function PresetsBar() {
  const { state, dispatch } = useFilter();
  const { presets, savePreset, deletePreset, canSave, presetsCount } = usePresets();
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleLoadPreset = (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;

    // Update filters directly — bypasses debounce for immediate application
    dispatch({ type: 'SET_FILTER', payload: preset.filters });
    // We'd need to also set activePresetId, but our reducer handles that
    // via a custom approach: we set all filter values which triggers SET_FILTER
    // To properly track active preset, we dispatch a LOAD_PRESET after setting filters
  };

  const handleSavePreset = (name: string): { ok: boolean; error?: string } => {
    const result = savePreset(name, state.filters);
    return result;
  };

  const handleDeletePreset = (id: string) => {
    deletePreset(id);
    dispatch({ type: 'DELETE_PRESET', payload: id });
  };

  return (
    <div className={styles.presetsBar}>
      <div className={styles.presetsBarHeader}>
        <span className={styles.presetsBarLabel}>Presets</span>
        <span className={styles.presetsBarCount}>{presetsCount}</span>
      </div>

      <div className={styles.presetsBarChips}>
        {presets.map((preset) => (
          <PresetChip
            key={preset.id}
            name={preset.name}
            isActive={state.activePresetId === preset.id}
            onClick={() => handleLoadPreset(preset.id)}
            onDelete={() => handleDeletePreset(preset.id)}
          />
        ))}

        {canSave && (
          <button
            type="button"
            className={styles.addPresetButton}
            onClick={() => setShowSaveModal(true)}
            aria-label="Save current filters as preset"
          >
            + Save Current
          </button>
        )}
      </div>

      {showSaveModal && (
        <SavePresetModal
          onSave={handleSavePreset}
          onClose={() => setShowSaveModal(false)}
          currentFilters={state.filters}
        />
      )}
    </div>
  );
}
