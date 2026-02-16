// Types for the Portfolio Risk Management feature (Issue #6)
// See ADR-6.md + SPEC-6.md for the full design

import type { StrategyLeg } from './strategy';

/** A single portfolio position (one or more legs) */
export interface Position {
  id: string;
  ticker: string;
  legs: StrategyLeg[];
  strategyName: string;
  strategyType: 'single' | 'vertical' | 'iron-condor' | 'straddle' | 'strangle' | 'custom';
  openDate: string;
  currentValue: number;
  costBasis: number;
  unrealizedPnL: number;
}

/** Aggregated Greeks for a portfolio or group */
export interface PortfolioGreeks {
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
}

/** User-configured risk threshold */
export interface RiskThreshold {
  id: string;
  metric: 'delta' | 'gamma' | 'theta' | 'vega' | 'pnl';
  operator: 'gt' | 'lt' | 'gte' | 'lte';
  value: number;
  enabled: boolean;
  label: string;
}

/** Alert generated when a threshold is breached */
export interface RiskAlert {
  id: string;
  thresholdId: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  triggeredAt: number;
  acknowledged: boolean;
}

/** High-level portfolio summary */
export interface PortfolioSummary {
  totalPositions: number;
  totalValue: number;
  totalCostBasis: number;
  totalPnL: number;
  pnlPercent: number;
  greeks: PortfolioGreeks;
}

/** Full portfolio state managed by useReducer */
export interface PortfolioState {
  positions: Position[];
  summary: PortfolioSummary;
  thresholds: RiskThreshold[];
  alerts: RiskAlert[];
  isLoading: boolean;
  error: string | null;
  groupBy: 'ticker' | 'strategy' | 'none';
}

/** All possible portfolio reducer actions */
export type PortfolioAction =
  | { type: 'SET_POSITIONS'; payload: Position[] }
  | { type: 'ADD_POSITION'; payload: Position }
  | { type: 'REMOVE_POSITION'; payload: string }
  | { type: 'UPDATE_SUMMARY'; payload: PortfolioSummary }
  | { type: 'ADD_THRESHOLD'; payload: RiskThreshold }
  | { type: 'UPDATE_THRESHOLD'; payload: { id: string; changes: Partial<RiskThreshold> } }
  | { type: 'REMOVE_THRESHOLD'; payload: string }
  | { type: 'TRIGGER_ALERT'; payload: RiskAlert }
  | { type: 'ACKNOWLEDGE_ALERT'; payload: string }
  | { type: 'CLEAR_ALERTS' }
  | { type: 'SET_GROUP_BY'; payload: 'ticker' | 'strategy' | 'none' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'FETCH_SUCCESS'; payload: { positions: Position[]; summary: PortfolioSummary } };
