'use client';

import React, { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';
import type {
  FilterState,
  FilterPreset,
  FilterAction,
  FilterContextState,
  ScanResponse,
} from '../../types/scanner';
import { DEFAULT_FILTERS } from '../../utils/filterDefaults';

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState: FilterContextState = {
  filters: { ...DEFAULT_FILTERS },
  presets: [],
  activePresetId: null,
  results: [],
  totalCount: 0,
  filteredCount: 0,
  isLoading: false,
  error: null,
  cacheAgeSeconds: 0,
};

// ─── Reducer ────────────────────────────────────────────────────────────────

function filterReducer(state: FilterContextState, action: FilterAction): FilterContextState {
  switch (action.type) {
    case 'SET_FILTER':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        activePresetId: null, // Clear active preset when user manually changes filters
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        filters: { ...DEFAULT_FILTERS },
        activePresetId: null,
      };

    case 'LOAD_PRESET': {
      const preset = state.presets.find((p) => p.id === action.payload);
      if (!preset) return state;
      return {
        ...state,
        filters: { ...preset.filters },
        activePresetId: preset.id,
      };
    }

    case 'SAVE_PRESET': {
      // Handled by usePresets hook — this action updates context presets list
      return state;
    }

    case 'DELETE_PRESET': {
      return {
        ...state,
        presets: state.presets.filter((p) => p.id !== action.payload),
        activePresetId:
          state.activePresetId === action.payload ? null : state.activePresetId,
      };
    }

    case 'SET_RESULTS': {
      const payload = action.payload as ScanResponse;
      return {
        ...state,
        results: payload.results,
        totalCount: payload.totalCount,
        filteredCount: payload.filteredCount,
        cacheAgeSeconds: payload.cacheAgeSeconds,
        isLoading: false,
        error: null,
      };
    }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload as boolean,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload as string | null,
        isLoading: false,
      };

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

interface FilterContextValue {
  state: FilterContextState;
  dispatch: Dispatch<FilterAction>;
}

const FilterContext = createContext<FilterContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

interface FilterProviderProps {
  children: ReactNode;
  /** Optionally pass initial presets (loaded from localStorage before render) */
  initialPresets?: FilterPreset[];
}

export function FilterProvider({ children, initialPresets }: FilterProviderProps) {
  const [state, dispatch] = useReducer(filterReducer, {
    ...initialState,
    presets: initialPresets ?? [],
  });

  return (
    <FilterContext.Provider value={{ state, dispatch }}>
      {children}
    </FilterContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Consume filter context.
 * Must be used inside a <FilterProvider>.
 */
export function useFilter(): FilterContextValue {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a <FilterProvider>');
  }
  return context;
}
