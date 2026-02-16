'use client';

import { useReducer, useCallback, useEffect } from 'react';
import type {
  StrategyBuilderState,
  StrategyAction,
  StrategyTemplate,
  StrategyLeg,
  StrategyConfig,
} from '../types/strategy';

const STORAGE_KEY = 'options-scanner:saved-strategies';

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState: StrategyBuilderState = {
  currentStrategy: null,
  selectedTemplate: null,
  ticker: '',
  underlyingPrice: 0,
  legs: [],
  step: 'template',
  savedStrategies: [],
  error: null,
};

// ─── Reducer ────────────────────────────────────────────────────────────────

function strategyReducer(state: StrategyBuilderState, action: StrategyAction): StrategyBuilderState {
  switch (action.type) {
    case 'SELECT_TEMPLATE':
      return { ...state, selectedTemplate: action.payload, error: null };

    case 'SET_TICKER':
      return { ...state, ticker: action.payload.ticker, underlyingPrice: action.payload.price };

    case 'ADD_LEG':
      return { ...state, legs: [...state.legs, action.payload] };

    case 'UPDATE_LEG':
      return {
        ...state,
        legs: state.legs.map((leg) =>
          leg.id === action.payload.id ? { ...leg, ...action.payload.changes } : leg,
        ),
      };

    case 'REMOVE_LEG':
      return { ...state, legs: state.legs.filter((leg) => leg.id !== action.payload) };

    case 'SET_STEP':
      return { ...state, step: action.payload, error: null };

    case 'APPLY_TEMPLATE':
      return { ...state, legs: action.payload, step: 'legs' };

    case 'SAVE_STRATEGY':
      return {
        ...state,
        savedStrategies: [
          action.payload,
          ...state.savedStrategies.filter((s) => s.id !== action.payload.id),
        ],
      };

    case 'LOAD_STRATEGY':
      return {
        ...state,
        currentStrategy: action.payload,
        selectedTemplate: action.payload.template,
        ticker: action.payload.ticker,
        underlyingPrice: action.payload.underlyingPrice,
        legs: action.payload.legs,
        step: 'review',
      };

    case 'DELETE_STRATEGY':
      return {
        ...state,
        savedStrategies: state.savedStrategies.filter((s) => s.id !== action.payload),
      };

    case 'RESET':
      return { ...initialState, savedStrategies: state.savedStrategies };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    default:
      return state;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useStrategyBuilder() {
  const [state, dispatch] = useReducer(strategyReducer, initialState);

  // Load saved strategies from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: StrategyConfig[] = JSON.parse(raw);
        for (const s of saved) {
          dispatch({ type: 'SAVE_STRATEGY', payload: s });
        }
      }
    } catch {
      // ignore corrupt data
    }
  }, []);

  // Persist saved strategies to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.savedStrategies));
    } catch {
      // ignore quota errors
    }
  }, [state.savedStrategies]);

  const selectTemplate = useCallback((template: StrategyTemplate) => {
    dispatch({ type: 'SELECT_TEMPLATE', payload: template });
  }, []);

  const setTicker = useCallback((ticker: string, price: number) => {
    dispatch({ type: 'SET_TICKER', payload: { ticker, price } });
  }, []);

  const addLeg = useCallback((leg: StrategyLeg) => {
    dispatch({ type: 'ADD_LEG', payload: leg });
  }, []);

  const updateLeg = useCallback((id: string, changes: Partial<StrategyLeg>) => {
    dispatch({ type: 'UPDATE_LEG', payload: { id, changes } });
  }, []);

  const removeLeg = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_LEG', payload: id });
  }, []);

  const setStep = useCallback((step: 'template' | 'legs' | 'review') => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const applyTemplate = useCallback((legs: StrategyLeg[]) => {
    dispatch({ type: 'APPLY_TEMPLATE', payload: legs });
  }, []);

  const saveStrategy = useCallback((config: StrategyConfig) => {
    dispatch({ type: 'SAVE_STRATEGY', payload: config });
  }, []);

  const loadStrategy = useCallback((config: StrategyConfig) => {
    dispatch({ type: 'LOAD_STRATEGY', payload: config });
  }, []);

  const deleteStrategy = useCallback((id: string) => {
    dispatch({ type: 'DELETE_STRATEGY', payload: id });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    dispatch,
    selectTemplate,
    setTicker,
    addLeg,
    updateLeg,
    removeLeg,
    setStep,
    applyTemplate,
    saveStrategy,
    loadStrategy,
    deleteStrategy,
    reset,
  };
}
