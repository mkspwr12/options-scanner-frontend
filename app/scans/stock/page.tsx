'use client';

import { useState, useCallback } from 'react';
import { FilterPanel } from '../../components/shared/FilterPanel';
import { TechnicalFilters as TechnicalFiltersComponent, type TechnicalFilters } from '../../components/stock-screener/TechnicalFilters';
import { FundamentalFilters as FundamentalFiltersComponent, type FundamentalFilters } from '../../components/stock-screener/FundamentalFilters';
import { MomentumFilters as MomentumFiltersComponent, type MomentumFilters } from '../../components/stock-screener/MomentumFilters';

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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Stock Screener</h1>
      <p className="text-gray-600 mb-6">
        Screen stocks by technical indicators, fundamentals, volume patterns, and sector performance.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Presets
        </label>
        <div className="flex gap-2">
          {presets.map((preset) => (
            <button
              key={preset.key}
              className="px-4 py-2 border border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 text-sm"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <FilterPanel title="Stock Filters" showActions={false}>
        <div className="border-b border-gray-200 mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('technical')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'technical'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Technical
            </button>
            <button
              onClick={() => setActiveTab('fundamental')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'fundamental'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Fundamental
            </button>
            <button
              onClick={() => setActiveTab('momentum')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'momentum'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Scanning...' : 'Run Stock Scan'}
          </button>
        </div>
      </FilterPanel>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Scan Error</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {results.length === 0 && !isLoading ? (
          <div className="p-8 text-center text-gray-500">
            No results yet. Configure filters and click &quot;Run Stock Scan&quot; to start.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change %
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Volume
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RSI
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P/E
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Market Cap
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((stock) => (
                    <tr key={stock.ticker} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stock.ticker}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {stock.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        ${stock.price.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                        stock.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                        {stock.volume.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                        {stock.rsi?.toFixed(1) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                        {stock.pe?.toFixed(2) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                        ${((stock.marketCap || 0) / 1e9).toFixed(2)}B
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadPage(page - 1)}
                    disabled={page === 1 || isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => loadPage(page + 1)}
                    disabled={page === totalPages || isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
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
