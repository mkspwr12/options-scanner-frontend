'use client';

import React, { createContext, useContext, type ReactNode } from 'react';
import { useStrategyBuilder } from '../../hooks/useStrategyBuilder';

// ─── Context Type ───────────────────────────────────────────────────────────

type StrategyContextValue = ReturnType<typeof useStrategyBuilder>;

const StrategyContext = createContext<StrategyContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

interface StrategyProviderProps {
  children: ReactNode;
}

/**
 * Provides strategy builder state & actions to the component tree.
 * Wraps the useStrategyBuilder hook so any child can consume via useStrategyContext.
 */
export function StrategyProvider({ children }: StrategyProviderProps) {
  const value = useStrategyBuilder();

  return (
    <StrategyContext.Provider value={value}>
      {children}
    </StrategyContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Consume strategy builder context.
 * Must be used inside a <StrategyProvider>.
 */
export function useStrategyContext(): StrategyContextValue {
  const context = useContext(StrategyContext);
  if (!context) {
    throw new Error('useStrategyContext must be used within a <StrategyProvider>');
  }
  return context;
}
