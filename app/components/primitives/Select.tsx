'use client';

import React from 'react';
import styles from '../../styles/scanner.module.css';

interface SelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

/**
 * Styled select dropdown matching dark theme.
 */
export const Select = React.memo(function Select({
  label,
  value,
  options,
  onChange,
}: SelectProps) {
  return (
    <div className={styles.selectWrapper}>
      <label className={styles.selectLabel}>{label}</label>
      <select
        className={styles.selectInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
});
