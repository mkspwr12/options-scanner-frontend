'use client';

import React, { useEffect, useRef } from 'react';
import styles from '../../styles/scanner.module.css';

interface ResultCountBadgeProps {
  count: number;
  isLoading: boolean;
}

/**
 * Live result count with pulse animation on update.
 * Badge scales 1.1× for 200ms when count changes.
 * See SPEC-2.md Section 2.2 (ResultCountBadge update).
 */
export const ResultCountBadge = React.memo(function ResultCountBadge({
  count,
  isLoading,
}: ResultCountBadgeProps) {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count !== prevCount.current && !isLoading) {
      const el = badgeRef.current;
      if (el) {
        el.classList.remove(styles.resultBadgePulse);
        // Force reflow to restart animation
        void el.offsetWidth;
        el.classList.add(styles.resultBadgePulse);
      }
      prevCount.current = count;
    }
  }, [count, isLoading]);

  return (
    <span
      ref={badgeRef}
      className={styles.resultCountBadge}
      aria-live="polite"
      aria-atomic="true"
    >
      {isLoading ? 'Loading...' : `${count} result${count !== 1 ? 's' : ''}`}
    </span>
  );
});
