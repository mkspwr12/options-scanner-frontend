'use client';

import { useReducer, useCallback, useEffect, useRef } from 'react';
import type {
  PortfolioState,
  PortfolioAction,
  Position,
  RiskThreshold,
  PortfolioSummary,
} from '../types/portfolio';
import { calculateSummary, evaluateThresholds } from '../utils/riskCalculations';

const DEFAULT_API_BASE = 'https://options-scanner-backend-2exk6s.azurewebsites.net';
const API_BASE =
  typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE
    ? process.env.NEXT_PUBLIC_API_BASE
    : DEFAULT_API_BASE;

const THRESHOLDS_KEY = 'options-scanner:risk-thresholds';

// ─── Default Thresholds ─────────────────────────────────────────────────────

const DEFAULT_THRESHOLDS: RiskThreshold[] = [
  { id: 'default-delta', metric: 'delta', operator: 'gt', value: 50, enabled: true, label: 'High Delta Exposure' },
  { id: 'default-theta', metric: 'theta', operator: 'lt', value: -100, enabled: true, label: 'Excessive Theta Decay' },
  { id: 'default-pnl', metric: 'pnl', operator: 'lt', value: -5000, enabled: true, label: 'Max Loss Breached' },
];

// ─── Empty Summary ──────────────────────────────────────────────────────────

const emptySummary: PortfolioSummary = {
  totalPositions: 0,
  totalValue: 0,
  totalCostBasis: 0,
  totalPnL: 0,
  pnlPercent: 0,
  greeks: { totalDelta: 0, totalGamma: 0, totalTheta: 0, totalVega: 0 },
};

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState: PortfolioState = {
  positions: [],
  summary: emptySummary,
  thresholds: DEFAULT_THRESHOLDS,
  alerts: [],
  isLoading: false,
  error: null,
  groupBy: 'none',
};

// ─── Reducer ────────────────────────────────────────────────────────────────

function portfolioReducer(state: PortfolioState, action: PortfolioAction): PortfolioState {
  switch (action.type) {
    case 'SET_POSITIONS':
      return { ...state, positions: action.payload };

    case 'ADD_POSITION':
      return { ...state, positions: [...state.positions, action.payload] };

    case 'REMOVE_POSITION':
      return { ...state, positions: state.positions.filter((p) => p.id !== action.payload) };

    case 'UPDATE_SUMMARY':
      return { ...state, summary: action.payload };

    case 'ADD_THRESHOLD':
      return { ...state, thresholds: [...state.thresholds, action.payload] };

    case 'UPDATE_THRESHOLD':
      return {
        ...state,
        thresholds: state.thresholds.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.changes } : t,
        ),
      };

    case 'REMOVE_THRESHOLD':
      return { ...state, thresholds: state.thresholds.filter((t) => t.id !== action.payload) };

    case 'TRIGGER_ALERT':
      return { ...state, alerts: [...state.alerts, action.payload] };

    case 'ACKNOWLEDGE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map((a) =>
          a.id === action.payload ? { ...a, acknowledged: true } : a,
        ),
      };

    case 'CLEAR_ALERTS':
      return { ...state, alerts: [] };

    case 'SET_GROUP_BY':
      return { ...state, groupBy: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        positions: action.payload.positions,
        summary: action.payload.summary,
        isLoading: false,
        error: null,
      };

    default:
      return state;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function usePortfolio() {
  const [state, dispatch] = useReducer(portfolioReducer, initialState);
  const mountedRef = useRef(true);

  // Load thresholds from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(THRESHOLDS_KEY);
      if (raw) {
        const saved: RiskThreshold[] = JSON.parse(raw);
        for (const t of saved) {
          dispatch({ type: 'ADD_THRESHOLD', payload: t });
        }
      }
    } catch {
      // ignore corrupt data
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Persist thresholds to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(state.thresholds));
    } catch {
      // ignore quota errors
    }
  }, [state.thresholds]);

  // Recalculate summary + evaluate thresholds whenever positions change
  useEffect(() => {
    if (state.positions.length === 0) {
      dispatch({ type: 'UPDATE_SUMMARY', payload: emptySummary });
      return;
    }

    const summary = calculateSummary(state.positions);
    dispatch({ type: 'UPDATE_SUMMARY', payload: summary });

    const alerts = evaluateThresholds(summary, state.thresholds);
    for (const alert of alerts) {
      dispatch({ type: 'TRIGGER_ALERT', payload: alert });
    }
  }, [state.positions, state.thresholds]);

  // Fetch positions from API
  const refetch = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const res = await fetch(`${API_BASE}/api/portfolio`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const data = await res.json();
      const positions: Position[] = Array.isArray(data.positions) ? data.positions : [];
      const summary = calculateSummary(positions);

      if (mountedRef.current) {
        dispatch({ type: 'FETCH_SUCCESS', payload: { positions, summary } });
      }
    } catch (err) {
      if (mountedRef.current) {
        dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to fetch portfolio' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    void refetch();
  }, [refetch]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const addPosition = useCallback((position: Position) => {
    dispatch({ type: 'ADD_POSITION', payload: position });
  }, []);

  const removePosition = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_POSITION', payload: id });
  }, []);

  const addThreshold = useCallback((threshold: RiskThreshold) => {
    dispatch({ type: 'ADD_THRESHOLD', payload: threshold });
  }, []);

  const updateThreshold = useCallback((id: string, changes: Partial<RiskThreshold>) => {
    dispatch({ type: 'UPDATE_THRESHOLD', payload: { id, changes } });
  }, []);

  const removeThreshold = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_THRESHOLD', payload: id });
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    dispatch({ type: 'ACKNOWLEDGE_ALERT', payload: id });
  }, []);

  const clearAlerts = useCallback(() => {
    dispatch({ type: 'CLEAR_ALERTS' });
  }, []);

  const setGroupBy = useCallback((groupBy: 'ticker' | 'strategy' | 'none') => {
    dispatch({ type: 'SET_GROUP_BY', payload: groupBy });
  }, []);

  return {
    state,
    addPosition,
    removePosition,
    addThreshold,
    updateThreshold,
    removeThreshold,
    acknowledgeAlert,
    clearAlerts,
    setGroupBy,
    refetch,
  };
}
