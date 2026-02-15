'use client';

import React from 'react';
import styles from '../../styles/scanner.module.css';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  /** If true, show ✕ dismiss button */
  dismissible?: boolean;
  onToggle?: () => void;
  onDismiss?: () => void;
}

/**
 * Selectable / dismissible chip used in DTE quick-select and ActiveFiltersBar.
 * Keyboard: Space/Enter to toggle/dismiss.
 */
export const FilterChip = React.memo(function FilterChip({
  label,
  selected = false,
  dismissible = false,
  onToggle,
  onDismiss,
}: FilterChipProps) {
  const handleClick = () => {
    if (dismissible && onDismiss) {
      onDismiss();
    } else if (onToggle) {
      onToggle();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      role={dismissible ? 'button' : 'option'}
      aria-selected={selected}
      aria-label={dismissible ? `Remove ${label} filter` : label}
      className={`${styles.filterChip} ${selected ? styles.filterChipSelected : ''} ${dismissible ? styles.filterChipDismissible : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span>{label}</span>
      {dismissible && <span className={styles.filterChipDismiss} aria-hidden="true">✕</span>}
    </button>
  );
});
