'use client';

import React, { useState } from 'react';
import { StrategyProvider, useStrategyContext } from './StrategyContext';
import { TemplateSelector } from './TemplateSelector';
import { LegEditor } from './LegEditor';
import { PayoffChart } from './PayoffChart';
import { StrategyMetricsPanel } from './StrategyMetricsPanel';
import { SavedStrategiesDrawer } from './SavedStrategiesDrawer';
import type { StrategyConfig } from '../../types/strategy';
import { uid } from '../../utils/uid';
import styles from '../../styles/strategy.module.css';

const STEPS = ['template', 'legs', 'review'] as const;
const STEP_LABELS = ['Template', 'Legs', 'Review'];

/**
 * Inner builder — must be inside StrategyProvider.
 * Renders the wizard step indicator, conditional step content,
 * and the saved strategies drawer.
 */
function StrategyBuilderInner() {
  const { state, saveStrategy, setStep, reset } = useStrategyContext();
  const [strategyName, setStrategyName] = useState('');

  const currentStepIndex = STEPS.indexOf(state.step);

  const handleSave = () => {
    if (!strategyName.trim()) return;

    const config: StrategyConfig = {
      id: uid(),
      name: strategyName.trim(),
      template: state.selectedTemplate ?? 'custom',
      ticker: state.ticker,
      underlyingPrice: state.underlyingPrice,
      legs: state.legs,
      createdAt: Date.now(),
    };

    saveStrategy(config);
    setStrategyName('');
  };

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Strategy Builder</h2>
        <button type="button" className={styles.btnSecondary} onClick={reset}>
          Reset
        </button>
      </div>

      {/* Wizard step indicator */}
      <div className={styles.wizardSteps}>
        {STEPS.map((step, i) => (
          <button
            key={step}
            type="button"
            className={`${styles.stepDot} ${i === currentStepIndex ? styles.stepDotActive : ''} ${i < currentStepIndex ? styles.stepDotDone : ''}`}
            onClick={() => i <= currentStepIndex && setStep(step)}
            disabled={i > currentStepIndex}
          >
            <span className={styles.stepNumber}>{i + 1}</span>
            <span className={styles.stepLabel}>{STEP_LABELS[i]}</span>
          </button>
        ))}
      </div>

      <div className={styles.builderLayout}>
        {/* Main content */}
        <div className={styles.mainContent}>
          {state.error && (
            <div className={styles.errorBanner} role="alert">
              ⚠ {state.error}
            </div>
          )}

          {state.step === 'template' && <TemplateSelector />}
          {state.step === 'legs' && <LegEditor />}
          {state.step === 'review' && (
            <div className={styles.reviewSection}>
              <h3 className={styles.stepTitle}>
                Review — {state.ticker} ({state.selectedTemplate ?? 'custom'})
              </h3>

              <div className={styles.reviewGrid}>
                <PayoffChart />
                <StrategyMetricsPanel />
              </div>

              {/* Save */}
              <div className={styles.saveRow}>
                <input
                  type="text"
                  className={styles.inputField}
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  placeholder="Strategy name"
                />
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={!strategyName.trim()}
                  onClick={handleSave}
                >
                  Save Strategy
                </button>
              </div>

              {/* Navigation */}
              <div className={styles.wizardActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setStep('legs')}>
                  ← Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <SavedStrategiesDrawer />
        </aside>
      </div>
    </div>
  );
}

/**
 * Top-level Strategy Builder section — wraps everything in StrategyProvider.
 * Drop this into page.tsx to add the strategy builder.
 * See SPEC-3.md Section 2.4 (Component Tree).
 */
export function StrategyBuilderSection() {
  return (
    <StrategyProvider>
      <StrategyBuilderInner />
    </StrategyProvider>
  );
}
