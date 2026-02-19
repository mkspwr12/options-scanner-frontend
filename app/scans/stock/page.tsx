'use client';

import { useState, useCallback } from 'react';
import { FilterPanel } from '../../components/shared/FilterPanel';
import { TechnicalFilters as TechnicalFiltersComponent, type TechnicalFilters } from '../../components/stock-screener/TechnicalFilters';
import { FundamentalFilters as FundamentalFiltersComponent, type FundamentalFilters } from '../../components/stock-screener/FundamentalFilters';
import { MomentumFilters as MomentumFiltersComponent, type MomentumFilters } from '../../components/stock-screener/MomentumFilters';
import { usePortfolio } from '../../hooks/usePortfolio';
import type { Position } from '../../types/portfolio';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://options-scanner-backend-2exk6s.azurewebsites.net';

const presets = [
  { name: 'High RSI Oversold', key: 'oversold' },
  { name: 'Earnings This Week', key: 'earnings' },
  { name: 'Strong Momentum', key: 'momentum' },
  { name: 'Value Stocks', key: 'value' },
];

interface StockResult {
  ticker: string;
  name: string;
  price: number;
  change: number;
  volume: number;
  rsi?: number;
  macd?: { value: number; signal: number; histogram: number };
  pe?: number;
  marketCap?: number;
  optionLiquidity?: string;
}

export default function StockScansPage() {
  const [activeTab, setActiveTab] = useState<'technical' | 'fundamental' | 'momentum'>('technical');
  const [technicalFilters, setTechnicalFilters] = useState<TechnicalFilters>({
    rsi: { min: 0, max: 100 },
    macdBullish: false,
    above50MA: false,
    above200MA: false,
    unusualVolume: false,
  });
  const [fundamentalFilters, setFundamentalFilters] = useState<FundamentalFilters>({
    peRatio: { min: 0, max: 100 },
    marketCap: 'all',
    earningsGrowth: { min: -100, max: 100 },
  });
  const [momentumFilters, setMomentumFilters] = useState<MomentumFilters>({
    insiderBuying: false,
    earningsWithinDays: null,
    volumeSpike: { min: 1.0, max: 10.0 },
  });

  const [results, setResults] = useState<StockResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { addPosition } = usePortfolio();

  const handleScan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPage(1);

    try {
      const response = await fetch(`${API_BASE}/api/stock-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            technical: technicalFilters,
            fundamental: fundamentalFilters,
            momentum: momentumFilters,
          },
          page: 1,
          pageSize: 50,
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage += `: ${errorData.error || errorData.message || response.statusText}`;
        } catch {
          errorMessage += `: ${response.statusText}`;
        }
        throw new Error(`Stock scan failed - ${errorMessage}. API endpoint may not be implemented yet.`);
      }

      const data = await response.json();
      setResults(data.results || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to scan stocks. Check console for details.';
      setError(errorMsg);
      console.error('Stock scan error:', err);
      console.error('API Base:', API_BASE);
      console.error('Endpoint:', `${API_BASE}/api/stock-scan`);
    } finally {
      setIsLoading(false);
    }
  }, [technicalFilters, fundamentalFilters, momentumFilters]);

  const loadPage = useCallback(async (newPage: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/stock-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            technical: technicalFilters,
            fundamental: fundamentalFilters,
            momentum: momentumFilters,
          },
          page: newPage,
          pageSize: 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`Stock scan failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.results || []);
      setPage(newPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page');
      console.error('Pagination error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [technicalFilters, fundamentalFilters, momentumFilters]);

  const handleTrackStock = useCallback(async (stock: StockResult) => {
    const quantityStr = prompt(`Enter quantity for ${stock.ticker}:`, '100');
    if (!quantityStr) return;

    const quantity = parseInt(quantityStr);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Invalid quantity');
      return;
    }

    // Create position object for stock (not options)
    const newPosition: Position = {
      id: `pos-${Date.now()}`,
      ticker: stock.ticker,
      strategy: 'stock', // This is a stock position, not an options strategy
      entryDate: new Date().toISOString(),
      quantity,
      costBasis: stock.price * quantity,
      currentValue: stock.price * quantity,
      pnl: 0,
      pnlPercent: 0,
      legs: [], // Stocks don't have option legs
      greeks: {
        delta: quantity * 100, // 100 delta per share * quantity
        gamma: 0,
        theta: 0,
        vega: 0,
      },
    };

    try {
      await addPosition(newPosition);
      alert(`✓ Successfully added ${quantity} shares of ${stock.ticker} to portfolio (${(stock.price * quantity).toFixed(2)}$)`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add position';
      alert(`✗ Failed to add position: ${errorMsg}\n\nThe backend may not have the add-position endpoint implemented yet.`);
    }
  }, [addPosition]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Stock Screener</h1>
      <p className="text-slate-400 mb-6">
        Screen stocks by technical indicators, fundamentals, volume patterns, and sector performance.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Quick Presets
        </label>
        <div className="flex gap-2">
          {presets.map((preset) => (
            <button
              key={preset.key}
              className="px-4 py-2 border border-white/10 rounded-md hover:border-blue-500/50 hover:bg-blue-500/10 text-sm text-slate-300 transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <FilterPanel title="Stock Filters" showActions={false}>
        <div className="border-b border-white/10 mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('technical')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'technical'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Technical
            </button>
            <button
              onClick={() => setActiveTab('fundamental')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'fundamental'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Fundamental
            </button>
            <button
              onClick={() => setActiveTab('momentum')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'momentum'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Momentum
            </button>
          </div>
        </div>

        {activeTab === 'technical' && (
          <TechnicalFiltersComponent filters={technicalFilters} onChange={setTechnicalFilters} />
        )}
        {activeTab === 'fundamental' && (
          <FundamentalFiltersComponent filters={fundamentalFilters} onChange={setFundamentalFilters} />
        )}
        {activeTab === 'momentum' && (
          <MomentumFiltersComponent filters={momentumFilters} onChange={setMomentumFilters} />
        )}

        <div className="mt-4">
          <button
            onClick={handleScan}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Scanning...' : 'Run Stock Scan'}
          </button>
        </div>
      </FilterPanel>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/30 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-400">Scan Error</h3>
              <div className="mt-1 text-sm text-red-300">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#0f1a2e] border border-white/10 rounded-lg overflow-hidden">
        {results.length === 0 && !isLoading ? (
          <div className="p-8 text-center text-slate-500">
            No results yet. Configure filters and click &quot;Run Stock Scan&quot; to start.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Ticker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Change %
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Volume
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      RSI
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      P/E
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Market Cap
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {results.map((stock) => (
                    <tr key={stock.ticker} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-cyan-400">
                        {stock.ticker}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {stock.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">
                        ${stock.price.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                        stock.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-300">
                        {stock.volume.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-300">
                        {stock.rsi?.toFixed(1) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-300">
                        {stock.pe?.toFixed(2) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-300">
                        ${((stock.marketCap || 0) / 1e9).toFixed(2)}B
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <button
                          onClick={() => handleTrackStock(stock)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium transition-colors"
                        >
                          Track
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadPage(page - 1)}
                    disabled={page === 1 || isLoading}
                    className="px-4 py-2 border border-white/10 rounded-md text-sm text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => loadPage(page + 1)}
                    disabled={page === totalPages || isLoading}
                    className="px-4 py-2 border border-white/10 rounded-md text-sm text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
