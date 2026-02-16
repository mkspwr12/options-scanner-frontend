// Types for the Multi-Leg Options Strategy Builder (Issue #3)
// See SPEC-3.md Section 4.1 for the full type diagram

export type OptionSide = 'buy' | 'sell';
export type OptionType = 'call' | 'put';
export type StrategyTemplate =
  | 'bull-call-spread'
  | 'bear-put-spread'
  | 'iron-condor'
  | 'straddle'
  | 'custom';

/** A single leg in a multi-leg options strategy */
export interface StrategyLeg {
  id: string;
  optionType: OptionType;
  side: OptionSide;
  strike: number;
  expiration: string;
  quantity: number;
  premium: number; // per contract
}

/** Full strategy configuration */
export interface StrategyConfig {
  id: string;
  name: string;
  template: StrategyTemplate;
  ticker: string;
  underlyingPrice: number;
  legs: StrategyLeg[];
  createdAt: number;
}

/** Single point on a payoff curve */
export interface PayoffPoint {
  price: number;
  profit: number;
}

/** Computed strategy metrics */
export interface StrategyMetrics {
  maxProfit: number | 'unlimited';
  maxLoss: number | 'unlimited';
  breakEvenPoints: number[];
  netDebit: number; // positive = debit, negative = credit
  totalPremium: number;
}

/** State for the strategy builder wizard */
export interface StrategyBuilderState {
  currentStrategy: StrategyConfig | null;
  selectedTemplate: StrategyTemplate | null;
  ticker: string;
  underlyingPrice: number;
  legs: StrategyLeg[];
  step: 'template' | 'legs' | 'review';
  savedStrategies: StrategyConfig[];
  error: string | null;
}

/** All possible strategy reducer actions */
export type StrategyAction =
  | { type: 'SELECT_TEMPLATE'; payload: StrategyTemplate }
  | { type: 'SET_TICKER'; payload: { ticker: string; price: number } }
  | { type: 'ADD_LEG'; payload: StrategyLeg }
  | { type: 'UPDATE_LEG'; payload: { id: string; changes: Partial<StrategyLeg> } }
  | { type: 'REMOVE_LEG'; payload: string }
  | { type: 'SET_STEP'; payload: 'template' | 'legs' | 'review' }
  | { type: 'APPLY_TEMPLATE'; payload: StrategyLeg[] }
  | { type: 'SAVE_STRATEGY'; payload: StrategyConfig }
  | { type: 'LOAD_STRATEGY'; payload: StrategyConfig }
  | { type: 'DELETE_STRATEGY'; payload: string }
  | { type: 'RESET' }
  | { type: 'SET_ERROR'; payload: string | null };
