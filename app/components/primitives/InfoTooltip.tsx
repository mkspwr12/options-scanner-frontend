'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from '../../styles/scanner.module.css';

interface InfoTooltipProps {
  text: string;
}

/**
 * Educational tooltip shown on hover/focus.
 * Static content only (no user input) — safe from XSS.
 */
export const InfoTooltip = React.memo(function InfoTooltip({ text }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isVisible) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsVisible(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible]);

  return (
    <span className={styles.tooltipWrapper}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.tooltipTrigger}
        aria-label="More information"
        aria-expanded={isVisible}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        ⓘ
      </button>
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={styles.tooltipContent}
        >
          {text}
        </div>
      )}
    </span>
  );
});
