'use client';

import React, { useState, useCallback } from 'react';
import styles from '../../styles/scanner.module.css';

interface NumberInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

/**
 * Numeric input with validation.
 * NaN → null, Infinity → max. See SPEC-2.md Section 6.1 (input validation).
 */
export const NumberInput = React.memo(function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  placeholder = '0',
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState(value !== null ? String(value) : '');

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setLocalValue(raw);

      if (raw.trim() === '') {
        onChange(null);
        return;
      }

      const num = Number(raw);
      if (isNaN(num)) return; // Don't commit invalid input
      if (!isFinite(num)) {
        onChange(max);
        return;
      }

      onChange(Math.max(min, Math.min(max, num)));
    },
    [onChange, min, max],
  );

  const handleBlur = useCallback(() => {
    // Reformat on blur
    if (value !== null) {
      setLocalValue(String(value));
    } else {
      setLocalValue('');
    }
  }, [value]);

  return (
    <div className={styles.numberInputWrapper}>
      <label className={styles.numberInputLabel}>{label}</label>
      <input
        type="number"
        className={styles.numberInput}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
});
