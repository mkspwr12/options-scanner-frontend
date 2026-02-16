'use client';

import React, { createContext, useContext, type ReactNode } from 'react';
import { usePortfolio } from '../../hooks/usePortfolio';

// ─── Context Type ───────────────────────────────────────────────────────────

type PortfolioContextValue = ReturnType<typeof usePortfolio>;

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

interface PortfolioProviderProps {
  children: ReactNode;
}

/**
 * Provides portfolio risk state & actions to the component tree.
 * Wraps the usePortfolio hook so any child can consume via usePortfolioContext.
 */
export function PortfolioProvider({ children }: PortfolioProviderProps) {
  const value = usePortfolio();

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Consume portfolio risk context.
 * Must be used inside a <PortfolioProvider>.
 */
export function usePortfolioContext(): PortfolioContextValue {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioContext must be used within a <PortfolioProvider>');
  }
  return context;
}
