'use client';

import React, { useCallback } from 'react';
import { useStrategyContext } from './StrategyContext';
import type { StrategyLeg, OptionType, OptionSide } from '../../types/strategy';
import {
  createBullCallSpread,
  createBearPutSpread,
  createIronCondor,
  createStraddle,
} from '../../utils/strategyTemplates';
import { uid } from '../../utils/uid';
import styles from '../../styles/strategy.module.css';

/**
 * Step 2 of the strategy wizard — configure individual legs.
 */
export function LegEditor() {
  const {
    state, setTicker, addLeg, updateLeg, removeLeg,
    applyTemplate, setStep,
  } = useStrategyContext();

  // Auto-populate template legs when entering this step
  const handleApplyTemplate = useCallback(() => {
    if (state.legs.length > 0 || !state.selectedTemplate || state.selectedTemplate === 'custom') return;

    const price = state.underlyingPrice || 100;
    const exp = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    let legs: StrategyLeg[] = [];
    switch (state.selectedTemplate) {
      case 'bull-call-spread':
        legs = createBullCallSpread(price * 0.95, price * 1.05, exp, 5.0, 2.0);
        break;
      case 'bear-put-spread':
        legs = createBearPutSpread(price * 0.95, price * 1.05, exp, 5.0, 2.0);
        break;
      case 'iron-condor':
        legs = createIronCondor(
          price * 0.85, price * 0.95, price * 1.05, price * 1.15,
          exp, [0.5, 1.5, 1.5, 0.5],
        );
        break;
      case 'straddle':
        legs = createStraddle(price, exp, 3.0, 3.0);
        break;
    }

    if (legs.length > 0) {
      applyTemplate(legs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedTemplate, state.underlyingPrice, state.legs.length]);

  React.useEffect(() => {
    handleApplyTemplate();
  }, [handleApplyTemplate]);

  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicker(e.target.value.toUpperCase(), state.underlyingPrice);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicker(state.ticker, parseFloat(e.target.value) || 0);
  };

  const handleAddLeg = () => {
    const newLeg: StrategyLeg = {
      id: uid(),
      optionType: 'call',
      side: 'buy',
      strike: state.underlyingPrice || 100,
      expiration: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      quantity: 1,
      premium: 1.0,
    };
    addLeg(newLeg);
  };

  const handleLegChange = (id: string, field: keyof StrategyLeg, value: string | number) => {
    if (field === 'strike' || field === 'quantity' || field === 'premium') {
      updateLeg(id, { [field]: parseFloat(String(value)) || 0 });
    } else {
      updateLeg(id, { [field]: value });
    }
  };

  const canProceed = state.legs.length >= 1 && state.ticker.length > 0 && state.underlyingPrice > 0;

  return (
    <div className={styles.legSection}>
      <h3 className={styles.stepTitle}>Configure Legs</h3>

      {/* Ticker + Price */}
      <div className={styles.tickerRow}>
        <label className={styles.inputLabel}>
          Ticker
          <input
            type="text"
            className={styles.inputField}
            value={state.ticker}
            onChange={handleTickerChange}
            placeholder="AAPL"
          />
        </label>
        <label className={styles.inputLabel}>
          Underlying Price ($)
          <input
            type="number"
            className={styles.inputField}
            value={state.underlyingPrice || ''}
            onChange={handlePriceChange}
            placeholder="150.00"
            min={0}
            step={0.01}
          />
        </label>
      </div>

      {/* Leg rows */}
      <div className={styles.legsContainer}>
        {state.legs.map((leg, index) => (
          <div key={leg.id} className={styles.legRow}>
            <span className={styles.legIndex}>#{index + 1}</span>

            <select
              className={styles.selectField}
              value={leg.optionType}
              onChange={(e) => handleLegChange(leg.id, 'optionType', e.target.value as OptionType)}
            >
              <option value="call">Call</option>
              <option value="put">Put</option>
            </select>

            <select
              className={styles.selectField}
              value={leg.side}
              onChange={(e) => handleLegChange(leg.id, 'side', e.target.value as OptionSide)}
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>

            <label className={styles.legFieldLabel}>
              Strike
              <input
                type="number"
                className={styles.inputFieldSm}
                value={leg.strike}
                onChange={(e) => handleLegChange(leg.id, 'strike', e.target.value)}
                min={0}
                step={0.5}
              />
            </label>

            <label className={styles.legFieldLabel}>
              Exp
              <input
                type="date"
                className={styles.inputFieldSm}
                value={leg.expiration}
                onChange={(e) => handleLegChange(leg.id, 'expiration', e.target.value)}
              />
            </label>

            <label className={styles.legFieldLabel}>
              Qty
              <input
                type="number"
                className={styles.inputFieldSm}
                value={leg.quantity}
                onChange={(e) => handleLegChange(leg.id, 'quantity', e.target.value)}
                min={1}
                step={1}
              />
            </label>

            <label className={styles.legFieldLabel}>
              Premium
              <input
                type="number"
                className={styles.inputFieldSm}
                value={leg.premium}
                onChange={(e) => handleLegChange(leg.id, 'premium', e.target.value)}
                min={0}
                step={0.01}
              />
            </label>

            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => removeLeg(leg.id)}
              title="Remove leg"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button type="button" className={styles.addLegBtn} onClick={handleAddLeg}>
        + Add Leg
      </button>

      {/* Navigation */}
      <div className={styles.wizardActions}>
        <button type="button" className={styles.btnSecondary} onClick={() => setStep('template')}>
          ← Back
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={!canProceed}
          onClick={() => setStep('review')}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
