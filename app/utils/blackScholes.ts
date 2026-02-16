// Client-side Black-Scholes calculator for payoff & metrics
// See SPEC-3.md Section 5.2 for calculation details

import type { StrategyLeg, PayoffPoint, StrategyMetrics } from '../types/strategy';

/** Standard normal CDF using Abramowitz & Stegun approximation (max error ~1.5e-7) */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

/** Black-Scholes European call price */
export function blackScholesCall(
  S: number, K: number, T: number, r: number, sigma: number,
): number {
  if (T <= 0) return Math.max(S - K, 0);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
}

/** Black-Scholes European put price */
export function blackScholesPut(
  S: number, K: number, T: number, r: number, sigma: number,
): number {
  if (T <= 0) return Math.max(K - S, 0);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

/** Calculate intrinsic value of a single leg at a given underlying price at expiration */
function legPayoff(leg: StrategyLeg, underlyingPrice: number): number {
  const multiplier = leg.side === 'buy' ? 1 : -1;
  let intrinsic: number;

  if (leg.optionType === 'call') {
    intrinsic = Math.max(underlyingPrice - leg.strike, 0);
  } else {
    intrinsic = Math.max(leg.strike - underlyingPrice, 0);
  }

  // P/L = (intrinsic value - premium paid) × quantity × direction
  const premiumCost = leg.premium * multiplier; // buy = pay premium, sell = receive premium
  return (intrinsic * multiplier - premiumCost) * leg.quantity * 100;
}

/** Calculate payoff curve for a set of legs at expiration */
export function calculatePayoffCurve(
  legs: StrategyLeg[],
  priceRange: [number, number],
  steps: number,
): PayoffPoint[] {
  const [minPrice, maxPrice] = priceRange;
  const stepSize = (maxPrice - minPrice) / steps;
  const points: PayoffPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const price = minPrice + stepSize * i;
    let totalProfit = 0;
    for (const leg of legs) {
      totalProfit += legPayoff(leg, price);
    }
    points.push({ price, profit: totalProfit });
  }

  return points;
}

/** Calculate strategy metrics from payoff curve */
export function calculateMetrics(
  legs: StrategyLeg[],
  underlyingPrice: number,
): StrategyMetrics {
  if (legs.length === 0) {
    return { maxProfit: 0, maxLoss: 0, breakEvenPoints: [], netDebit: 0, totalPremium: 0 };
  }

  // Net premium: positive = debit (you pay), negative = credit (you receive)
  let netDebit = 0;
  let totalPremium = 0;
  for (const leg of legs) {
    const cost = leg.premium * leg.quantity * 100;
    totalPremium += cost;
    netDebit += leg.side === 'buy' ? cost : -cost;
  }

  // Compute payoff curve across a wide range
  const low = underlyingPrice * 0.5;
  const high = underlyingPrice * 1.5;
  const curve = calculatePayoffCurve(legs, [low, high], 1000);

  let maxProfit: number | 'unlimited' = -Infinity;
  let maxLoss: number | 'unlimited' = Infinity;
  const breakEvenPoints: number[] = [];

  for (let i = 0; i < curve.length; i++) {
    const p = curve[i];
    if (typeof maxProfit === 'number' && p.profit > maxProfit) maxProfit = p.profit;
    if (typeof maxLoss === 'number' && p.profit < maxLoss) maxLoss = p.profit;

    // Detect zero-crossing for break-even
    if (i > 0) {
      const prev = curve[i - 1];
      if ((prev.profit <= 0 && p.profit >= 0) || (prev.profit >= 0 && p.profit <= 0)) {
        // Linear interpolation for break-even point
        const ratio = Math.abs(prev.profit) / (Math.abs(prev.profit) + Math.abs(p.profit));
        const bePrice = prev.price + ratio * (p.price - prev.price);
        breakEvenPoints.push(Math.round(bePrice * 100) / 100);
      }
    }
  }

  // Check if profit/loss continues to grow at edges (indicates unlimited)
  const edgeThreshold = underlyingPrice * 0.01;
  const firstProfit = curve[0].profit;
  const lastProfit = curve[curve.length - 1].profit;
  const nearFirstProfit = curve[10]?.profit ?? firstProfit;
  const nearLastProfit = curve[curve.length - 11]?.profit ?? lastProfit;

  if (Math.abs(lastProfit - nearLastProfit) > edgeThreshold ||
      Math.abs(firstProfit - nearFirstProfit) > edgeThreshold) {
    if (lastProfit > nearLastProfit || firstProfit > nearFirstProfit) {
      maxProfit = 'unlimited';
    }
    if (lastProfit < nearLastProfit || firstProfit < nearFirstProfit) {
      maxLoss = 'unlimited';
    }
  }

  return {
    maxProfit: maxProfit === -Infinity ? 0 : maxProfit,
    maxLoss: maxLoss === Infinity ? 0 : maxLoss,
    breakEvenPoints,
    netDebit,
    totalPremium,
  };
}
