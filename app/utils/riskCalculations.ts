// Risk calculation utilities for Portfolio Risk Management (Issue #6)
// See SPEC-6.md for algorithm details

import type { StrategyLeg } from '../types/strategy';
import type {
  Position,
  PortfolioGreeks,
  PortfolioSummary,
  RiskThreshold,
  RiskAlert,
} from '../types/portfolio';

/** Aggregate Greeks across all positions */
export function aggregateGreeks(positions: Position[]): PortfolioGreeks {
  const greeks: PortfolioGreeks = {
    totalDelta: 0,
    totalGamma: 0,
    totalTheta: 0,
    totalVega: 0,
  };

  for (const position of positions) {
    for (const leg of position.legs) {
      const sign = leg.side === 'buy' ? 1 : -1;
      const qty = leg.quantity * sign;
      // Premium serves as a proxy for per-contract greek contribution
      // In production, Greeks would come from the API per contract
      greeks.totalDelta += qty * leg.premium * (leg.optionType === 'call' ? 0.5 : -0.5);
      greeks.totalGamma += Math.abs(qty) * leg.premium * 0.05;
      greeks.totalTheta += qty * leg.premium * -0.03;
      greeks.totalVega += Math.abs(qty) * leg.premium * 0.1;
    }
  }

  return {
    totalDelta: Math.round(greeks.totalDelta * 100) / 100,
    totalGamma: Math.round(greeks.totalGamma * 100) / 100,
    totalTheta: Math.round(greeks.totalTheta * 100) / 100,
    totalVega: Math.round(greeks.totalVega * 100) / 100,
  };
}

/** Calculate portfolio summary from positions */
export function calculateSummary(positions: Position[]): PortfolioSummary {
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalCostBasis = positions.reduce((sum, p) => sum + p.costBasis, 0);
  const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
  const pnlPercent = totalCostBasis !== 0 ? (totalPnL / totalCostBasis) * 100 : 0;
  const greeks = aggregateGreeks(positions);

  return {
    totalPositions: positions.length,
    totalValue: Math.round(totalValue * 100) / 100,
    totalCostBasis: Math.round(totalCostBasis * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
    greeks,
  };
}

/** Resolve a metric value from the summary for threshold comparison */
function resolveMetric(summary: PortfolioSummary, metric: RiskThreshold['metric']): number {
  switch (metric) {
    case 'delta': return summary.greeks.totalDelta;
    case 'gamma': return summary.greeks.totalGamma;
    case 'theta': return summary.greeks.totalTheta;
    case 'vega': return summary.greeks.totalVega;
    case 'pnl': return summary.totalPnL;
  }
}

/** Check if a threshold condition is breached */
function isBreached(actual: number, operator: RiskThreshold['operator'], target: number): boolean {
  switch (operator) {
    case 'gt': return actual > target;
    case 'lt': return actual < target;
    case 'gte': return actual >= target;
    case 'lte': return actual <= target;
  }
}

/** Evaluate all enabled thresholds and return triggered alerts */
export function evaluateThresholds(
  summary: PortfolioSummary,
  thresholds: RiskThreshold[],
): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  for (const threshold of thresholds) {
    if (!threshold.enabled) continue;

    const actual = resolveMetric(summary, threshold.metric);
    if (isBreached(actual, threshold.operator, threshold.value)) {
      const severity: RiskAlert['severity'] =
        threshold.metric === 'pnl' && threshold.operator === 'lt' ? 'critical' : 'warning';

      alerts.push({
        id: `alert-${threshold.id}-${Date.now()}`,
        thresholdId: threshold.id,
        message: `${threshold.label}: ${threshold.metric} is ${actual.toFixed(2)} (threshold: ${threshold.operator} ${threshold.value})`,
        severity,
        triggeredAt: Date.now(),
        acknowledged: false,
      });
    }
  }

  return alerts;
}

/** Auto-detect strategy type from a set of legs */
export function detectStrategyType(legs: StrategyLeg[]): Position['strategyType'] {
  if (legs.length === 0) return 'custom';
  if (legs.length === 1) return 'single';

  if (legs.length === 2) {
    const [a, b] = legs;
    const sameType = a.optionType === b.optionType;
    const sameStrike = a.strike === b.strike;

    if (sameType && !sameStrike) return 'vertical';
    if (!sameType && sameStrike) return 'straddle';
    if (!sameType && !sameStrike) return 'strangle';
  }

  if (legs.length === 4) return 'iron-condor';

  return 'custom';
}
