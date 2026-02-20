'use client';

import { useState, useCallback } from 'react';

const BACKEND_API = process.env.NEXT_PUBLIC_API_BASE || 'https://options-scanner-backend-2exk6s.azurewebsites.net';

const DEFAULT_TICKERS = ['SPY', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'QQQ', 'AMD'];

interface YahooQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
}

interface YahooOption {
  symbol: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  impliedVolatility: number;
  expiration: string;
  type: 'call' | 'put';
}

interface BackendOption {
  symbol: string;
  strike: number;
  premium: number;
  type: string;
  expiration: string;
  delta: number;
  iv: number;
  probability: number;
}

interface BackendStock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  volume: number;
  marketCap: number;
}

interface ComparisonRow {
  ticker: string;
  yahoo: YahooQuote | null;
  yahooError?: string;
  backendStock: BackendStock | null;
  backendStockError?: string;
  backendOptions: BackendOption[];
  backendOptionsError?: string;
  yahooOptions: YahooOption[];
}

export default function ComparePage() {
  const [tickers, setTickers] = useState(DEFAULT_TICKERS.join(', '));
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [yahooTime, setYahooTime] = useState<number | null>(null);
  const [backendTime, setBackendTime] = useState<number | null>(null);
  const [yahooSource, setYahooSource] = useState('');
  const [includeOptions, setIncludeOptions] = useState(true);

  const runComparison = useCallback(async () => {
    setLoading(true);
    setRows([]);
    setYahooTime(null);
    setBackendTime(null);

    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    if (tickerList.length === 0) {
      setLoading(false);
      return;
    }

    // 1. Fetch from Yahoo Finance (via our Next.js API route)
    const yahooStart = performance.now();
    let yahooQuotes: YahooQuote[] = [];
    let yahooOpts: YahooOption[] = [];
    let yahooErr = '';
    try {
      const optParam = includeOptions && tickerList.length <= 5 ? '&options=true' : '';
      const res = await fetch(`/api/yahoo-prices?tickers=${tickerList.join(',')}${optParam}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      yahooQuotes = data.quotes || [];
      yahooOpts = data.options || [];
      setYahooSource(data.source || 'unknown');
    } catch (err) {
      yahooErr = err instanceof Error ? err.message : 'Yahoo fetch failed';
    }
    setYahooTime(Math.round(performance.now() - yahooStart));

    // 2. Fetch from Backend — both stock prices AND options
    const backendStart = performance.now();
    const backendStockResults: Record<string, { stock: BackendStock | null; error?: string }> = {};
    const backendOptResults: Record<string, { options: BackendOption[]; error?: string }> = {};

    // 2a. Fetch stock prices from backend /api/stock-scan
    try {
      const stockRes = await fetch(`${BACKEND_API}/api/stock-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectors: [], minPrice: 0, maxPrice: 100000, minVolume: 0, tickers: tickerList }),
      });
      const stockData = await stockRes.json();
      const stocks: BackendStock[] = stockData.results || [];
      for (const t of tickerList) {
        const found = stocks.find((s: BackendStock) => s.ticker === t);
        backendStockResults[t] = found ? { stock: found } : { stock: null, error: `No stock data (source: ${stockData.source || 'unknown'})` };
      }
    } catch (err) {
      for (const t of tickerList) {
        backendStockResults[t] = { stock: null, error: err instanceof Error ? err.message : 'Stock fetch failed' };
      }
    }

    // 2b. Fetch options from backend /api/scan
    await Promise.all(
      tickerList.map(async (ticker) => {
        try {
          const res = await fetch(`${BACKEND_API}/api/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ticker,
              minDelta: 0.1,
              maxDelta: 0.9,
              minDTE: 7,
              maxDTE: 60,
              strategy: 'single',
            }),
          });
          const data = await res.json();
          if (data.status === 'error') {
            backendOptResults[ticker] = { options: [], error: data.detail || 'Error' };
          } else {
            backendOptResults[ticker] = { options: data.results || [] };
          }
        } catch (err) {
          backendOptResults[ticker] = {
            options: [],
            error: err instanceof Error ? err.message : 'Options fetch failed',
          };
        }
      })
    );
    setBackendTime(Math.round(performance.now() - backendStart));

    // 3. Build comparison rows
    const comparisonRows: ComparisonRow[] = tickerList.map((ticker) => {
      const yq = yahooQuotes.find((q) => q.symbol === ticker) || null;
      const bs = backendStockResults[ticker] || { stock: null };
      const bo = backendOptResults[ticker] || { options: [] };
      const yo = yahooOpts.filter((o) => o.symbol === ticker);
      return {
        ticker,
        yahoo: yq,
        yahooError: yq ? undefined : yahooErr || 'No data returned',
        backendStock: bs.stock,
        backendStockError: bs.error,
        backendOptions: bo.options,
        backendOptionsError: bo.error,
        yahooOptions: yo,
      };
    });

    setRows(comparisonRows);
    setLoading(false);
  }, [tickers, includeOptions]);

  const priceDiff = (yahooPrice: number | undefined, backendStrike: number | undefined) => {
    if (!yahooPrice || !backendStrike) return null;
    const diff = Math.abs(yahooPrice - backendStrike);
    const pct = (diff / yahooPrice) * 100;
    return { diff, pct };
  };

  return (
    <div className="min-h-screen bg-[#0b1224] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📊 Data Validation: Backend vs Yahoo Finance</h1>
          <p className="text-slate-400">
            Compare your backend API data against live Yahoo Finance prices to identify discrepancies.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-[#0f1a2e] border border-white/10 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-slate-300 mb-1">Tickers (comma-separated)</label>
              <input
                type="text"
                value={tickers}
                onChange={(e) => setTickers(e.target.value)}
                className="w-full bg-[#0b1224] border border-white/20 rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
                placeholder="SPY, AAPL, MSFT..."
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOptions}
                  onChange={(e) => setIncludeOptions(e.target.checked)}
                  className="rounded bg-[#0b1224] border-white/20"
                />
                Include Options Chain
              </label>
              <button
                onClick={runComparison}
                disabled={loading}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 text-white font-semibold px-6 py-2 rounded transition-colors whitespace-nowrap"
              >
                {loading ? '⏳ Comparing...' : '🔍 Run Comparison'}
              </button>
            </div>
          </div>

          {/* Timing info */}
          {(yahooTime !== null || backendTime !== null) && (
            <div className="flex gap-6 mt-4 text-sm">
              {yahooTime !== null && (
                <div className="text-emerald-400">
                  ✓ Yahoo Finance: {yahooTime}ms ({yahooSource})
                </div>
              )}
              {backendTime !== null && (
                <div className="text-blue-400">
                  ✓ Backend API: {backendTime}ms
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {rows.length > 0 && (
          <>
            {/* Stock Price Comparison */}
            <div className="bg-[#0f1a2e] border border-white/10 rounded-lg overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-xl font-bold">📈 Stock Price Comparison</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Yahoo Finance live prices vs Backend scan data
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0b1224] text-slate-400 text-left">
                      <th className="px-4 py-3">Ticker</th>
                      <th className="px-4 py-3">Yahoo Price</th>
                      <th className="px-4 py-3">Yahoo Change</th>
                      <th className="px-4 py-3">Yahoo Volume</th>
                      <th className="px-4 py-3">Backend Price</th>
                      <th className="px-4 py-3">Backend Change</th>
                      <th className="px-4 py-3">Price Diff</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const yahooPrice = row.yahoo?.regularMarketPrice;
                      const backendPrice = row.backendStock?.price;
                      const diff = priceDiff(yahooPrice, backendPrice);
                      const isClose = diff && diff.pct < 2;
                      const isOff = diff && diff.pct >= 2 && diff.pct < 10;
                      const isWrong = diff && diff.pct >= 10;

                      return (
                        <tr key={row.ticker} className="border-t border-white/5 hover:bg-white/5">
                          <td className="px-4 py-3 font-bold text-white">{row.ticker}</td>
                          <td className="px-4 py-3">
                            {row.yahoo ? (
                              <span className="text-emerald-400 font-mono">
                                ${row.yahoo.regularMarketPrice.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-red-400 text-xs">{row.yahooError}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.yahoo && (
                              <span
                                className={
                                  row.yahoo.regularMarketChange >= 0
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                                }
                              >
                                {row.yahoo.regularMarketChange >= 0 ? '+' : ''}
                                {row.yahoo.regularMarketChange.toFixed(2)} (
                                {row.yahoo.regularMarketChangePercent.toFixed(2)}%)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-300 font-mono">
                            {row.yahoo
                              ? (row.yahoo.regularMarketVolume / 1e6).toFixed(1) + 'M'
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {row.backendStock ? (
                              <span className="text-blue-400 font-mono">
                                ${row.backendStock.price.toFixed(2)}
                              </span>
                            ) : row.backendStockError ? (
                              <span className="text-red-400 text-xs">{row.backendStockError}</span>
                            ) : (
                              <span className="text-slate-500">No data</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.backendStock && (
                              <span
                                className={
                                  row.backendStock.change >= 0
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                                }
                              >
                                {row.backendStock.change >= 0 ? '+' : ''}
                                {row.backendStock.change.toFixed(2)}%
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {diff ? (
                              <span
                                className={
                                  isClose
                                    ? 'text-emerald-400'
                                    : isOff
                                    ? 'text-amber-400'
                                    : 'text-red-400'
                                }
                              >
                                ${diff.diff.toFixed(2)} ({diff.pct.toFixed(1)}%)
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {!row.yahoo && !row.backendStock ? (
                              <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
                                NO DATA
                              </span>
                            ) : !row.yahoo ? (
                              <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400">
                                YAHOO ✗
                              </span>
                            ) : !row.backendStock ? (
                              <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                                BACKEND ✗
                              </span>
                            ) : isClose ? (
                              <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">
                                ✓ MATCH
                              </span>
                            ) : isOff ? (
                              <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400">
                                ⚠ STALE
                              </span>
                            ) : isWrong ? (
                              <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                                ✗ WRONG
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
                                ?
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Options Chain Comparison (if included) */}
            {includeOptions && rows.some((r) => r.yahooOptions.length > 0 || r.backendOptions.length > 0) && (
              <div className="bg-[#0f1a2e] border border-white/10 rounded-lg overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-white/10">
                  <h2 className="text-xl font-bold">⚡ Options Chain Comparison</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Yahoo Finance options vs Backend options data
                  </p>
                </div>

                {rows
                  .filter((r) => r.yahooOptions.length > 0 || r.backendOptions.length > 0)
                  .map((row) => (
                    <div key={`opt-${row.ticker}`} className="border-b border-white/5 last:border-b-0">
                      <div className="px-6 py-3 bg-[#0b1224] flex items-center gap-4">
                        <span className="font-bold text-white text-lg">{row.ticker}</span>
                        {row.yahoo && (
                          <span className="text-emerald-400 font-mono text-sm">
                            Stock: ${row.yahoo.regularMarketPrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-slate-500 text-xs">
                          Yahoo: {row.yahooOptions.length} options | Backend:{' '}
                          {row.backendOptions.length} options
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                        {/* Yahoo Options */}
                        <div className="border-r border-white/5">
                          <div className="px-4 py-2 text-xs font-semibold text-emerald-400 bg-emerald-500/5">
                            YAHOO FINANCE OPTIONS
                          </div>
                          {row.yahooOptions.length > 0 ? (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-slate-500">
                                  <th className="px-3 py-1 text-left">Type</th>
                                  <th className="px-3 py-1 text-right">Strike</th>
                                  <th className="px-3 py-1 text-right">Last</th>
                                  <th className="px-3 py-1 text-right">Bid/Ask</th>
                                  <th className="px-3 py-1 text-right">IV</th>
                                  <th className="px-3 py-1 text-right">Exp</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.yahooOptions.slice(0, 10).map((opt, i) => (
                                  <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                                    <td className="px-3 py-1">
                                      <span
                                        className={
                                          opt.type === 'call'
                                            ? 'text-emerald-400'
                                            : 'text-red-400'
                                        }
                                      >
                                        {opt.type.toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="px-3 py-1 text-right font-mono text-white">
                                      ${opt.strike.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-1 text-right font-mono text-slate-300">
                                      ${opt.lastPrice.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-1 text-right font-mono text-slate-400">
                                      ${opt.bid.toFixed(2)}/${opt.ask.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-1 text-right font-mono text-amber-400">
                                      {(opt.impliedVolatility * 100).toFixed(1)}%
                                    </td>
                                    <td className="px-3 py-1 text-right text-slate-400">
                                      {opt.expiration}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="px-4 py-6 text-center text-slate-500 text-xs">
                              No Yahoo options data
                            </div>
                          )}
                        </div>

                        {/* Backend Options */}
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-blue-400 bg-blue-500/5">
                            BACKEND API OPTIONS
                          </div>
                          {row.backendOptions.length > 0 ? (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-slate-500">
                                  <th className="px-3 py-1 text-left">Type</th>
                                  <th className="px-3 py-1 text-right">Strike</th>
                                  <th className="px-3 py-1 text-right">Premium</th>
                                  <th className="px-3 py-1 text-right">Delta</th>
                                  <th className="px-3 py-1 text-right">IV</th>
                                  <th className="px-3 py-1 text-right">Exp</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.backendOptions.slice(0, 10).map((opt, i) => (
                                  <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                                    <td className="px-3 py-1">
                                      <span
                                        className={
                                          opt.type === 'call'
                                            ? 'text-emerald-400'
                                            : 'text-red-400'
                                        }
                                      >
                                        {opt.type.toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="px-3 py-1 text-right font-mono text-white">
                                      ${opt.strike.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-1 text-right font-mono text-slate-300">
                                      ${opt.premium.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-1 text-right font-mono text-cyan-400">
                                      {opt.delta.toFixed(3)}
                                    </td>
                                    <td className="px-3 py-1 text-right font-mono text-amber-400">
                                      {(opt.iv * 100).toFixed(1)}%
                                    </td>
                                    <td className="px-3 py-1 text-right text-slate-400">
                                      {opt.expiration}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="px-4 py-6 text-center text-slate-500 text-xs">
                              {row.backendOptionsError || 'No backend options data'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Summary Card */}
            <div className="bg-[#0f1a2e] border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">📋 Validation Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0b1224] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{rows.length}</div>
                  <div className="text-xs text-slate-400 mt-1">Tickers Tested</div>
                </div>
                <div className="bg-[#0b1224] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {rows.filter((r) => r.yahoo).length}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Yahoo Data OK</div>
                </div>
                <div className="bg-[#0b1224] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {rows.filter((r) => r.backendStock).length}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Backend Stocks OK</div>
                </div>
                <div className="bg-[#0b1224] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {rows.filter((r) => {
                      const yp = r.yahoo?.regularMarketPrice;
                      const bp = r.backendStock?.price;
                      if (!yp || !bp) return false;
                      return (Math.abs(yp - bp) / yp) * 100 >= 10;
                    }).length}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Wrong Price (&gt;10% off)</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <h3 className="text-amber-400 font-semibold text-sm mb-2">💡 Key Findings</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  {rows.filter((r) => !r.yahoo).length > 0 && (
                    <li>
                      • Yahoo Finance returned no data for{' '}
                      {rows.filter((r) => !r.yahoo).map((r) => r.ticker).join(', ')}
                    </li>
                  )}
                  {rows.filter((r) => !r.backendStock).length > 0 && (
                    <li>
                      • Backend returned no stock price for{' '}
                      {rows.filter((r) => !r.backendStock).map((r) => r.ticker).join(', ')}
                    </li>
                  )}
                  {rows.filter((r) => r.backendOptions.length === 0).length > 0 && (
                    <li>
                      • Backend returned no options for{' '}
                      {rows.filter((r) => r.backendOptions.length === 0).map((r) => r.ticker).join(', ')}
                    </li>
                  )}
                  {rows.some((r) => {
                    const bo = r.backendOptions[0];
                    return bo && bo.iv > 2;
                  }) && (
                    <li>
                      • Backend shows impossibly high IV values (
                      {rows
                        .filter((r) => r.backendOptions.some((o) => o.iv > 2))
                        .map((r) => {
                          const maxIv = Math.max(...r.backendOptions.map((o) => o.iv));
                          return `${r.ticker}: ${(maxIv * 100).toFixed(0)}%`;
                        })
                        .join(', ')}
                      ) — likely stale/fake data
                    </li>
                  )}
                  {rows.some((r) => r.backendOptions.every((o) => o.delta === 0)) &&
                    rows.filter((r) => r.backendOptions.length > 0).length > 0 && (
                      <li>
                        • Backend returns delta=0 for all options — Greeks are not being calculated
                      </li>
                    )}
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && rows.length === 0 && (
          <div className="bg-[#0f1a2e] border border-white/10 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">🔬</div>
            <h2 className="text-xl font-bold mb-2">Ready to Compare</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Click &quot;Run Comparison&quot; to fetch live Yahoo Finance data and compare it against
              your backend API results side by side.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
