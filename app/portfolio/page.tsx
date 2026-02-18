'use client';

import { useCallback, useState } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { PLSummary } from '../components/portfolio/PLSummary';
import { AggregateChart } from '../components/portfolio/AggregateChart';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://options-scanner-backend-2exk6s.azurewebsites.net';

export default function PortfolioPage() {
  const { state, refetch } = usePortfolio();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleClose = useCallback(async (id: string) => {
    setActionLoading(id);
    setActionError(null);

    try {
      const position = state.positions.find((p) => p.id === id);
      if (!position) {
        throw new Error('Position not found');
      }

      const response = await fetch(`${API_BASE}/api/portfolio/close-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: id,
          closePrice: position.currentValue || 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to close position: ${response.statusText}`);
      }

      // Refresh portfolio after closing
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to close position');
      console.error('Close position error:', err);
    } finally {
      setActionLoading(null);
    }
  }, [state.positions, refetch]);

  const handleRoll = useCallback(async (id: string) => {
    setActionLoading(id);
    setActionError(null);

    try {
      const position = state.positions.find((p) => p.id === id);
      if (!position) {
        throw new Error('Position not found');
      }

      // For now, roll to next month with same strikes
      const newExpiration = new Date();
      newExpiration.setMonth(newExpiration.getMonth() + 1);

      const response = await fetch(`${API_BASE}/api/portfolio/roll-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: id,
          newExpiration: newExpiration.toISOString().split('T')[0],
          adjustStrikes: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to roll position: ${response.statusText}`);
      }

      // Refresh portfolio after rolling
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to roll position');
      console.error('Roll position error:', err);
    } finally {
      setActionLoading(null);
    }
  }, [state.positions, refetch]);

  const handleAdjust = useCallback(async (id: string) => {
    setActionLoading(id);
    setActionError(null);

    try {
      const position = state.positions.find((p) => p.id === id);
      if (!position) {
        throw new Error('Position not found');
      }

      // For now, add a protective put (strike calculation would be based on position details)
      const response = await fetch(`${API_BASE}/api/portfolio/adjust-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: id,
          adjustmentType: 'add_protective_put',
          strike: position.costBasis - 10,
          quantity: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to adjust position: ${response.statusText}`);
      }

      // Refresh portfolio after adjusting
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to adjust position');
      console.error('Adjust position error:', err);
    } finally {
      setActionLoading(null);
    }
  }, [state.positions, refetch]);

  const totalPL = state.summary.totalPnL || 0;
  const totalPLPercent = state.summary.pnlPercent || 0;
  
  // Calculate P&L percentage for each position
  const getPositionPnlPercent = (position: typeof state.positions[0]) => {
    if (!position.costBasis || position.costBasis === 0) return 0;
    return position.pnlPercent;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Track positions, analyze risk metrics, and monitor P&L
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={state.isLoading}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {state.isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {state.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {state.error}
        </div>
      )}

      {actionError && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
          {actionError}
          <button
            onClick={() => setActionError(null)}
            className="ml-2 text-yellow-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <PLSummary
        totalPL={totalPL}
        totalPLPercent={totalPLPercent}
        maxProfit={state.summary.totalValue || 0}
        maxLoss={state.summary.totalCostBasis || 0}
      />

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Positions ({state.positions.length})</h2>
        {state.positions.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">
              {state.isLoading ? 'Loading positions...' : 'No positions found. Add a position to get started.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Strategy
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {state.positions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {position.ticker}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {position.strategyName || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      ${(position.currentValue || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-medium ${
                            position.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ${position.pnl.toFixed(2)}
                        </span>
                        <span
                          className={`text-xs ${
                            getPositionPnlPercent(position) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ({getPositionPnlPercent(position) >= 0 ? '+' : ''}
                          {getPositionPnlPercent(position).toFixed(2)}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleClose(position.id)}
                          disabled={actionLoading === position.id}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {actionLoading === position.id ? '...' : 'Close'}
                        </button>
                        <button
                          onClick={() => handleRoll(position.id)}
                          disabled={actionLoading === position.id}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {actionLoading === position.id ? '...' : 'Roll'}
                        </button>
                        <button
                          onClick={() => handleAdjust(position.id)}
                          disabled={actionLoading === position.id}
                          className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                        >
                          {actionLoading === position.id ? '...' : 'Adjust'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AggregateChart positions={state.positions.map((p) => ({
        id: p.id,
        symbol: p.ticker,
        strategy: p.strategyName || '',
        legs: p.legs.map(l => `${l.strike}${l.optionType === 'call' ? 'C' : 'P'}`).join('/'),
        costBasis: p.costBasis || 0,
        currentValue: p.currentValue || 0,
        pnl: p.pnl,
        pnlPercent: getPositionPnlPercent(p),
        sparklineData: [],
      }))} />
    </div>
  );
}
