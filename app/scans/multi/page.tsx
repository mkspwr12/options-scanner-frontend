'use client';

import { useState, useCallback } from 'react';
import { StrategyBuilder } from '../../components/strategy/StrategyBuilder';
import { FilterPanel } from '../../components/shared/FilterPanel';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://options-scanner-backend-2exk6s.azurewebsites.net';

interface MultiLegScanResult {
  strategyType: string;
  legs: Array<{
    type: string;
    strike: number;
    premium: number;
    delta: number;
  }>;
  netCredit: number;
  maxProfit: number;
  maxLoss: number;
  breakevens: number[];
  probability: number;
  payoutChart?: { pricePoints: number[]; profitPoints: number[] };
}

export default function MultiLegPage() {
  const [ticker, setTicker] = useState('SPY');
  const [strategyType, setStrategyType] = useState<'iron_condor' | 'vertical_spread' | 'calendar_spread' | 'butterfly' | 'diagonal_spread'>('iron_condor');
  const [filters, setFilters] = useState({
    minProbability: 70,
    minCredit: 100,
    dteRange: [30, 60],
    maxBuyingPower: 5000,
  });
  const [scanResults, setScanResults] = useState<MultiLegScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/multi-leg-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          strategyType,
          filters: {
            minProbability: filters.minProbability,
            minCredit: filters.minCredit,
            dteRange: filters.dteRange,
            maxBuyingPower: filters.maxBuyingPower,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Multi-leg scan failed: ${response.statusText}`);
      }

      const data = await response.json();
      setScanResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan multi-leg strategies');
      console.error('Multi-leg scan error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ticker, strategyType, filters]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Multi-Leg Strategies</h1>
      <p className="text-gray-600 mb-6">
        Build and analyze multi-leg options strategies including spreads, iron condors, butterflies, and custom combinations.
      </p>

      {/* Strategy Scanner Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Strategy Scanner</h2>
        <FilterPanel title="Scan Filters" showActions={false}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticker Symbol
              </label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="SPY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Strategy Type
              </label>
              <select
                value={strategyType}
                onChange={(e) => setStrategyType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="iron_condor">Iron Condor</option>
                <option value="vertical_spread">Vertical Spread</option>
                <option value="calendar_spread">Calendar Spread</option>
                <option value="butterfly">Butterfly</option>
                <option value="diagonal_spread">Diagonal Spread</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Probability: {filters.minProbability}%
              </label>
              <input
                type="range"
                min="50"
                max="95"
                value={filters.minProbability}
                onChange={(e) =>
                  setFilters({ ...filters, minProbability: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Credit: ${filters.minCredit}
              </label>
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={filters.minCredit}
                onChange={(e) =>
                  setFilters({ ...filters, minCredit: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DTE Range: {filters.dteRange[0]} - {filters.dteRange[1]}
              </label>
              <input
                type="range"
                min="7"
                max="90"
                value={filters.dteRange[0]}
                onChange={(e) =>
                  setFilters({ ...filters, dteRange: [Number(e.target.value), filters.dteRange[1]] })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Buying Power: ${filters.maxBuyingPower}
              </label>
              <input
                type="number"
                value={filters.maxBuyingPower}
                onChange={(e) =>
                  setFilters({ ...filters, maxBuyingPower: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                step="500"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleScan}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Scanning...' : 'Scan for Strategies'}
            </button>
          </div>
        </FilterPanel>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {scanResults.length > 0 && (
          <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 font-medium">
              Scan Results ({scanResults.length})
            </div>
            <div className="divide-y divide-gray-200">
              {scanResults.map((result, index) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {result.strategyType.replace(/_/g, ' ').toUpperCase()}
                      </h3>
                      <div className="text-sm text-gray-600">
                        {result.legs.length} legs • {result.probability}% probability
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-green-600">
                        ${result.netCredit.toFixed(2)} Credit
                      </div>
                      <div className="text-xs text-gray-500">
                        Max P/L: ${result.maxProfit} / ${result.maxLoss}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    {result.legs.map((leg, legIndex) => (
                      <div key={legIndex} className="bg-gray-50 p-2 rounded">
                        <div className="font-medium">{leg.type.toUpperCase()}</div>
                        <div className="text-gray-600">
                          ${leg.strike} @ ${leg.premium}
                        </div>
                      </div>
                    ))}
                  </div>
                  {result.breakevens.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      Breakevens: {result.breakevens.map((b) => `$${b.toFixed(2)}`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manual Strategy Builder Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Manual Strategy Builder</h2>
        <StrategyBuilder />
      </div>
    </div>
  );
}
