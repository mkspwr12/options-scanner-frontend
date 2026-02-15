'use client';

import React, { type ReactNode } from 'react';
import { InfoTooltip } from '../primitives/InfoTooltip';
import styles from '../../styles/scanner.module.css';

interface FilterGroupProps {
  label: string;
  tooltip?: string;
  children: ReactNode;
}

/**
 * Label + tooltip + filter control wrapper.
 * Provides consistent layout for each filter row.
 */
export const FilterGroup = React.memo(function FilterGroup({
  label,
  tooltip,
  children,
}: FilterGroupProps) {
  return (
    <div className={styles.filterGroup}>
      <div className={styles.filterGroupHeader}>
        <span className={styles.filterGroupLabel}>{label}</span>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className={styles.filterGroupControl}>{children}</div>
    </div>
  );
});
