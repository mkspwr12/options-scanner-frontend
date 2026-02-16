'use client';

import { useReducer, useCallback, useEffect, useRef } from 'react';
import type {
  ProviderConfig,
  ProviderManagerState,
  ProviderAction,
} from '../types/data-provider';
import { DEFAULT_YAHOO_CONFIG, createDefaultHealth } from '../types/data-provider';
import { createProvider } from '../utils/providerFactory';

const STORAGE_KEY = 'options-scanner:providers';

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState: ProviderManagerState = {
  providers: [DEFAULT_YAHOO_CONFIG],
  healthMap: { [DEFAULT_YAHOO_CONFIG.id]: createDefaultHealth(DEFAULT_YAHOO_CONFIG.id) },
  activeProviderId: DEFAULT_YAHOO_CONFIG.id,
  isFailoverActive: false,
  lastFailoverTime: null,
};

// ─── Reducer ────────────────────────────────────────────────────────────────

function providerReducer(
  state: ProviderManagerState,
  action: ProviderAction,
): ProviderManagerState {
  switch (action.type) {
    case 'ADD_PROVIDER':
      return {
        ...state,
        providers: [...state.providers, action.payload],
        healthMap: {
          ...state.healthMap,
          [action.payload.id]: createDefaultHealth(action.payload.id),
        },
      };

    case 'REMOVE_PROVIDER':
      return {
        ...state,
        providers: state.providers.filter((p) => p.id !== action.payload),
        healthMap: Object.fromEntries(
          Object.entries(state.healthMap).filter(([k]) => k !== action.payload),
        ),
        activeProviderId:
          state.activeProviderId === action.payload ? null : state.activeProviderId,
      };

    case 'UPDATE_PROVIDER':
      return {
        ...state,
        providers: state.providers.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.changes } : p,
        ),
      };

    case 'SET_HEALTH':
      return {
        ...state,
        healthMap: { ...state.healthMap, [action.payload.providerId]: action.payload },
      };

    case 'SET_ACTIVE':
      return { ...state, activeProviderId: action.payload };

    case 'FAILOVER':
      return {
        ...state,
        activeProviderId: action.payload.toId,
        isFailoverActive: true,
        lastFailoverTime: Date.now(),
      };

    case 'RESET_FAILOVER':
      return {
        ...state,
        isFailoverActive: false,
        lastFailoverTime: null,
        activeProviderId:
          state.providers
            .filter((p) => p.enabled)
            .sort((a, b) => a.priority - b.priority)[0]?.id ?? null,
      };

    case 'REORDER':
      return { ...state, providers: action.payload };

    default:
      return state;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useProviderManager() {
  const [state, dispatch] = useReducer(providerReducer, initialState);
  const didLoad = useRef(false);

  // Load persisted configs from localStorage on mount
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ProviderConfig[];
      if (!Array.isArray(saved) || saved.length === 0) return;

      // Replace default state with saved configs
      saved.forEach((cfg) => {
        dispatch({ type: 'ADD_PROVIDER', payload: cfg });
      });
      // Remove the default yahoo if it was replaced by a persisted one
      const hasYahoo = saved.some((c) => c.id === DEFAULT_YAHOO_CONFIG.id);
      if (!hasYahoo) {
        // Keep the default; persisted providers are additions
      }
      dispatch({ type: 'SET_ACTIVE', payload: saved.sort((a, b) => a.priority - b.priority)[0].id });
    } catch {
      // Silently ignore corrupt storage
    }
  }, []);

  // Persist to localStorage whenever providers change (strip API keys for security)
  useEffect(() => {
    try {
      const safeProviders = state.providers.map(({ apiKey, ...rest }) => ({
        ...rest,
        apiKey: apiKey ? '***' : undefined,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeProviders));
    } catch {
      // Quota exceeded — ignore
    }
  }, [state.providers]);

  const addProvider = useCallback((config: ProviderConfig) => {
    dispatch({ type: 'ADD_PROVIDER', payload: config });
  }, []);

  const removeProvider = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_PROVIDER', payload: id });
  }, []);

  const updateProvider = useCallback((id: string, changes: Partial<ProviderConfig>) => {
    dispatch({ type: 'UPDATE_PROVIDER', payload: { id, changes } });
  }, []);

  const setActiveProvider = useCallback((id: string) => {
    dispatch({ type: 'SET_ACTIVE', payload: id });
  }, []);

  const reorderProviders = useCallback((reordered: ProviderConfig[]) => {
    dispatch({ type: 'REORDER', payload: reordered });
  }, []);

  const resetFailover = useCallback(() => {
    dispatch({ type: 'RESET_FAILOVER' });
  }, []);

  const testConnection = useCallback(
    async (id: string): Promise<boolean> => {
      const cfg = state.providers.find((p) => p.id === id);
      if (!cfg) return false;

      const provider = createProvider(cfg);
      const ok = await provider.testConnection();
      dispatch({ type: 'SET_HEALTH', payload: provider.getHealth() });
      return ok;
    },
    [state.providers],
  );

  const performFailover = useCallback(() => {
    if (!state.activeProviderId) return;

    const candidates = state.providers
      .filter((p) => p.enabled && p.id !== state.activeProviderId)
      .sort((a, b) => a.priority - b.priority);

    if (candidates.length === 0) return;

    dispatch({
      type: 'FAILOVER',
      payload: { fromId: state.activeProviderId, toId: candidates[0].id },
    });
  }, [state.activeProviderId, state.providers]);

  return {
    state,
    addProvider,
    removeProvider,
    updateProvider,
    setActiveProvider,
    testConnection,
    reorderProviders,
    resetFailover,
    performFailover,
  };
}
