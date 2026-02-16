'use client';

import React, { createContext, useContext, type ReactNode } from 'react';
import type { ProviderConfig, ProviderManagerState } from '../../types/data-provider';
import { useProviderManager } from '../../hooks/useProviderManager';

// ─── Context Type ───────────────────────────────────────────────────────────

interface ProviderContextValue extends ProviderManagerState {
  addProvider: (config: ProviderConfig) => void;
  removeProvider: (id: string) => void;
  updateProvider: (id: string, changes: Partial<ProviderConfig>) => void;
  setActiveProvider: (id: string) => void;
  testConnection: (id: string) => Promise<boolean>;
  reorderProviders: (reordered: ProviderConfig[]) => void;
  resetFailover: () => void;
  performFailover: () => void;
}

const ProviderContext = createContext<ProviderContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function ProviderProvider({ children }: { children: ReactNode }) {
  const {
    state,
    addProvider,
    removeProvider,
    updateProvider,
    setActiveProvider,
    testConnection,
    reorderProviders,
    resetFailover,
    performFailover,
  } = useProviderManager();

  const value: ProviderContextValue = {
    ...state,
    addProvider,
    removeProvider,
    updateProvider,
    setActiveProvider,
    testConnection,
    reorderProviders,
    resetFailover,
    performFailover,
  };

  return (
    <ProviderContext.Provider value={value}>
      {children}
    </ProviderContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useProviderContext(): ProviderContextValue {
  const ctx = useContext(ProviderContext);
  if (!ctx) {
    throw new Error('useProviderContext must be used within a <ProviderProvider>');
  }
  return ctx;
}
