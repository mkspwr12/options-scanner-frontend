'use client';

import React from 'react';
import { useStrategyContext } from './StrategyContext';
import type { StrategyTemplate } from '../../types/strategy';
import styles from '../../styles/strategy.module.css';

interface TemplateOption {
  id: StrategyTemplate;
  name: string;
  icon: string;
  description: string;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'bull-call-spread',
    name: 'Bull Call Spread',
    icon: '📈',
    description: 'Buy a call at a lower strike and sell a call at a higher strike. Limited risk, limited reward bullish strategy.',
  },
  {
    id: 'bear-put-spread',
    name: 'Bear Put Spread',
    icon: '📉',
    description: 'Buy a put at a higher strike and sell a put at a lower strike. Limited risk, limited reward bearish strategy.',
  },
  {
    id: 'iron-condor',
    name: 'Iron Condor',
    icon: '🦅',
    description: 'Sell an OTM put spread and an OTM call spread. Profit when the underlying stays in a range.',
  },
  {
    id: 'straddle',
    name: 'Straddle',
    icon: '⚡',
    description: 'Buy a call and a put at the same strike. Profit from large moves in either direction.',
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: '🔧',
    description: 'Build your own multi-leg strategy from scratch with full control over each leg.',
  },
];

/**
 * Step 1 of the strategy wizard — select a strategy template.
 */
export function TemplateSelector() {
  const { state, selectTemplate, setStep } = useStrategyContext();

  const handleSelect = (template: StrategyTemplate) => {
    selectTemplate(template);
  };

  const handleNext = () => {
    if (!state.selectedTemplate) return;
    setStep('legs');
  };

  return (
    <div className={styles.templateSection}>
      <h3 className={styles.stepTitle}>Choose a Strategy Template</h3>

      <div className={styles.templateGrid}>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.templateCard} ${state.selectedTemplate === t.id ? styles.templateCardSelected : ''}`}
            onClick={() => handleSelect(t.id)}
          >
            <span className={styles.templateIcon}>{t.icon}</span>
            <span className={styles.templateName}>{t.name}</span>
            <span className={styles.templateDesc}>{t.description}</span>
          </button>
        ))}
      </div>

      <div className={styles.wizardActions}>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={!state.selectedTemplate}
          onClick={handleNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
