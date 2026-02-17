'use client';

import { useState, useCallback } from 'react';
import { FilterPanel } from '../../components/shared/FilterPanel';
import { VirtualizedResultTable } from '../../components/shared/VirtualizedResultTable';
import { MiniPayoutChart } from '../../components/scanner/MiniPayoutChart';
import { ProbabilityBadge } from '../../components/scanner/ProbabilityBadge';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://options-scanner-backend-2exk6s.azurewebsites.net';

interface ScanResult {
  symbol: string;
  strike: number;
  expiration: string;
  type: 'call' | 'put';
  premium: number;
  delta: number;
  iv: number;
  probability: number;
  payoutChart: { prices: number[]; pnl: number[] };
  breakeven: number;
  maxProfit: number;
  maxLoss: number;
  position: string;
}

export default function SingleOptionsPage() {
  const [filters, setFilters] = useState({
    ticker: 'SPY',
    dte: [30, 45],
    delta: [0.3, 0.5],
    strike: [570, 590],
    ivMin: 20,
  });

  const [results, setResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: filters.ticker,
          minDelta: filters.delta[0],
          maxDelta: filters.delta[1],
          minDTE: filters.dte[0],
          maxDTE: filters.dte[1],
          minIV: filters.ivMin,
        }),
      });

      if (!response.ok) {
        throw new Error(`Scan failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Map backend response to frontend interface
      const mappedResults: ScanResult[] = (data.results || data || []).map((item: any) => ({
        symbol: item.ticker || item.symbol,
        strike: item.strike,
        expiration: item.expiration,
        type: item.type || (item.delta > 0 ? 'call' : 'put'),
        premium: item.premium,
        delta: item.delta,
        iv: item.iv,
        probability: item.probability || Math.abs(item.delta * 100),
        payoutChart: {
          prices: item.payoutChart?.pricePoints || [],
          pnl: item.payoutChart?.profitPoints || [],
        },
        breakeven: item.breakeven || 0,
        maxProfit: item.maxProfit || 0,
        maxLoss: item.maxLoss || 0,
        position: item.position || 'long',
      }));

      setResults(mappedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan options');
      console.error('Scan error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const renderRow = useCallback((result: ScanResult, index: number) => (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 hover:bg-gray-50">
      <div className="w-16 font-medium">{result.symbol}</div>
      <div className="w-20">${result.strike}</div>
      <div className="w-24">{result.expiration}</div>
      <div className="w-16 uppercase text-xs">{result.type}</div>
      <div className="w-20">${result.premium.toFixed(2)}</div>
      <div className="w-20">{result.delta.toFixed(2)}</div>
      <div className="w-20">{result.iv}%</div>
      <div className="w-24">
        <ProbabilityBadge probability={result.probability} />
      </div>
      <div className="w-28">
        <MiniPayoutChart
          prices={result.payoutChart.prices}
          pnl={result.payoutChart.pnl}
        />
      </div>
    </div>
  ), []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Single Options Scan</h1>
      <p className="text-gray-600 mb-6">
        Scan for single-leg options opportunities based on technical indicators, volume, and probability metrics.
      </p>

      <FilterPanel
        title="Scanner Filters"
        onReset={() => setFilters({
          ticker: 'SPY',
          dte: [30, 45],
          delta: [0.3, 0.5],
          strike: [570, 590],
          ivMin: 20,
        })}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ticker Symbol
            </label>
            <input
              type="text"
              value={filters.ticker}
              onChange={(e) => setFilters({ ...filters, ticker: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="SPY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min IV: {filters.ivMin}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={filters.ivMin}
              onChange={(e) => setFilters({ ...filters, ivMin: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DTE Range: {filters.dte[0]} - {filters.dte[1]}
            </label>
            <input
              type="range"
              min="7"
              max="90"
              value={filters.dte[0]}
              onChange={(e) =>
                setFilters({ ...filters, dte: [Number(e.target.value), filters.dte[1]] })
              }
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delta Range: {filters.delta[0]} - {filters.delta[1]}
            </label>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={filters.delta[0]}
              onChange={(e) =>
                setFilters({ ...filters, delta: [Number(e.target.value), filters.delta[1]] })
              }
              className="w-full"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleScan}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </FilterPanel>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
          <div className="w-16">Symbol</div>
          <div className="w-20">Strike</div>
          <div className="w-24">Expiration</div>
          <div className="w-16">Type</div>
          <div className="w-20">Premium</div>
          <div className="w-20">Delta</div>
          <div className="w-20">IV</div>
          <div className="w-24">Probability</div>
          <div className="w-28">P&L Chart</div>
        </div>
        {results.length === 0 && !isLoading ? (
          <div className="p-8 text-center text-gray-500">
            No results yet. Configure filters and click &quot;Run Scan&quot; to start.
          </div>
        ) : (
          <VirtualizedResultTable
            data={results}
            rowHeight={50}
            height={600}
            renderRow={renderRow}
            getRowKey={(item, index) => `${item.symbol}-${item.strike}-${index}`}
          />
        )}
      </div>
    </div>
  );
}
