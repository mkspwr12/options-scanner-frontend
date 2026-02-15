'use client';

import React, { useRef, useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import styles from '../../styles/scanner.module.css';

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  unit?: string;
  /** Format the value for display (e.g. add % or Δ) */
  formatValue?: (v: number) => string;
}

/**
 * Dual-handle range slider with requestAnimationFrame visual updates.
 * Keyboard: Arrow ±1 step, Shift+Arrow ±5 steps, Home/End → min/max.
 * WCAG 2.1 AA: role="slider", aria-valuemin/max/now/text.
 * See SPEC-2.md Section 7.3 (Slider Performance).
 */
export const RangeSlider = React.memo(function RangeSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  unit = '',
  formatValue,
}: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [visualValue, setVisualValue] = useState<[number, number]>(value);
  const isDragging = useRef<'min' | 'max' | null>(null);
  const rafId = useRef<number | null>(null);

  // Sync prop changes to visual state
  useEffect(() => {
    if (!isDragging.current) {
      setVisualValue(value);
    }
  }, [value]);

  const fmt = formatValue ?? ((v: number) => `${v}${unit}`);

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));

  const getPositionPercent = (v: number) => ((v - min) / (max - min)) * 100;

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return min;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return clamp(min + pct * (max - min));
    },
    [min, max, step],
  );

  const handlePointerDown = useCallback(
    (thumb: 'min' | 'max') => (e: React.PointerEvent) => {
      e.preventDefault();
      isDragging.current = thumb;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const newVal = getValueFromPosition(e.clientX);

      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setVisualValue((prev) => {
          if (isDragging.current === 'min') {
            const lo = Math.min(newVal, prev[1] - step);
            return [clamp(lo), prev[1]];
          } else {
            const hi = Math.max(newVal, prev[0] + step);
            return [prev[0], clamp(hi)];
          }
        });
      });
    },
    [getValueFromPosition, step],
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = null;
      // Commit visual state to actual filter state
      onChange(visualValue);
    }
  }, [onChange, visualValue]);

  const handleKeyDown = useCallback(
    (thumb: 'min' | 'max') => (e: KeyboardEvent<HTMLDivElement>) => {
      const multiplier = e.shiftKey ? 5 : 1;
      let [lo, hi] = value;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault();
          if (thumb === 'min') {
            lo = clamp(lo + step * multiplier);
            if (lo >= hi) lo = hi - step;
          } else {
            hi = clamp(hi + step * multiplier);
          }
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault();
          if (thumb === 'min') {
            lo = clamp(lo - step * multiplier);
          } else {
            hi = clamp(hi - step * multiplier);
            if (hi <= lo) hi = lo + step;
          }
          break;
        case 'Home':
          e.preventDefault();
          if (thumb === 'min') lo = min;
          else hi = lo + step;
          break;
        case 'End':
          e.preventDefault();
          if (thumb === 'min') lo = hi - step;
          else hi = max;
          break;
        default:
          return;
      }

      onChange([clamp(lo), clamp(hi)]);
    },
    [value, onChange, min, max, step],
  );

  const minPct = getPositionPercent(visualValue[0]);
  const maxPct = getPositionPercent(visualValue[1]);

  return (
    <div className={styles.rangeSlider}>
      <div className={styles.rangeSliderValues}>
        <span>{fmt(visualValue[0])}</span>
        <span>{fmt(visualValue[1])}</span>
      </div>

      <div
        ref={trackRef}
        className={styles.rangeSliderTrack}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Filled range */}
        <div
          className={styles.rangeSliderFill}
          style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
        />

        {/* Min thumb */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={`${label} minimum`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={visualValue[0]}
          aria-valuetext={fmt(visualValue[0])}
          className={styles.rangeSliderThumb}
          style={{ left: `${minPct}%` }}
          onPointerDown={handlePointerDown('min')}
          onKeyDown={handleKeyDown('min')}
        />

        {/* Max thumb */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={`${label} maximum`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={visualValue[1]}
          aria-valuetext={fmt(visualValue[1])}
          className={styles.rangeSliderThumb}
          style={{ left: `${maxPct}%` }}
          onPointerDown={handlePointerDown('max')}
          onKeyDown={handleKeyDown('max')}
        />
      </div>
    </div>
  );
});
