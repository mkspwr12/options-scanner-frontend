'use client';

import React from 'react';
import styles from '../../styles/scanner.module.css';

interface PresetChipProps {
  name: string;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

/**
 * Preset chip with active ring indicator and delete button.
 */
export const PresetChip = React.memo(function PresetChip({
  name,
  isActive,
  onClick,
  onDelete,
}: PresetChipProps) {
  return (
    <div className={`${styles.presetChip} ${isActive ? styles.presetChipActive : ''}`}>
      <button
        type="button"
        className={styles.presetChipLabel}
        onClick={onClick}
        aria-label={`Load preset: ${name}`}
        aria-pressed={isActive}
      >
        {name}
      </button>
      <button
        type="button"
        className={styles.presetChipDelete}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`Delete preset: ${name}`}
      >
        ✕
      </button>
    </div>
  );
});
