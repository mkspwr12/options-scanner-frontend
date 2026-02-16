// Template factory functions for pre-configured multi-leg strategies
// See SPEC-3.md Section 5.3 for template definitions

import type { StrategyLeg } from '../types/strategy';

/** Generate a unique leg ID */
function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/**
 * Bull Call Spread: Buy lower-strike call, sell higher-strike call.
 * Max profit = (strike2 - strike1 - net debit) × 100
 * Max loss   = net debit
 */
export function createBullCallSpread(
  strike1: number, strike2: number, expiration: string,
  premium1: number, premium2: number,
): StrategyLeg[] {
  return [
    { id: uid(), optionType: 'call', side: 'buy',  strike: strike1, expiration, quantity: 1, premium: premium1 },
    { id: uid(), optionType: 'call', side: 'sell', strike: strike2, expiration, quantity: 1, premium: premium2 },
  ];
}

/**
 * Bear Put Spread: Buy higher-strike put, sell lower-strike put.
 * Max profit = (strike2 - strike1 - net debit) × 100
 * Max loss   = net debit
 */
export function createBearPutSpread(
  strike1: number, strike2: number, expiration: string,
  premium1: number, premium2: number,
): StrategyLeg[] {
  return [
    { id: uid(), optionType: 'put', side: 'buy',  strike: strike2, expiration, quantity: 1, premium: premium1 },
    { id: uid(), optionType: 'put', side: 'sell', strike: strike1, expiration, quantity: 1, premium: premium2 },
  ];
}

/**
 * Iron Condor: Sell OTM put spread + sell OTM call spread.
 * 4 legs: buy put(low), sell put(mid-low), sell call(mid-high), buy call(high)
 */
export function createIronCondor(
  putLow: number, putHigh: number, callLow: number, callHigh: number,
  expiration: string, premiums: number[],
): StrategyLeg[] {
  const [p1 = 0.5, p2 = 1.0, p3 = 1.0, p4 = 0.5] = premiums;
  return [
    { id: uid(), optionType: 'put',  side: 'buy',  strike: putLow,   expiration, quantity: 1, premium: p1 },
    { id: uid(), optionType: 'put',  side: 'sell', strike: putHigh,  expiration, quantity: 1, premium: p2 },
    { id: uid(), optionType: 'call', side: 'sell', strike: callLow,  expiration, quantity: 1, premium: p3 },
    { id: uid(), optionType: 'call', side: 'buy',  strike: callHigh, expiration, quantity: 1, premium: p4 },
  ];
}

/**
 * Straddle: Buy ATM call + ATM put at same strike.
 * Max profit = unlimited (either direction)
 * Max loss   = total premium paid
 */
export function createStraddle(
  strike: number, expiration: string,
  callPremium: number, putPremium: number,
): StrategyLeg[] {
  return [
    { id: uid(), optionType: 'call', side: 'buy', strike, expiration, quantity: 1, premium: callPremium },
    { id: uid(), optionType: 'put',  side: 'buy', strike, expiration, quantity: 1, premium: putPremium },
  ];
}
