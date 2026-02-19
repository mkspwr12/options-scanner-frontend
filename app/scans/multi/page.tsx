'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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

/** Inline mini payout chart rendered on a canvas */
function MiniPayoutCanvas({ data, maxProfit, maxLoss }: { data?: { pricePoints: number[]; profitPoints: number[] }; maxProfit: number; maxLoss: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 280;
    const h = 140;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Generate synthetic payout data if not provided
    let prices: number[];
    let pnl: number[];

    if (data?.pricePoints?.length && data?.profitPoints?.length) {
      prices = data.pricePoints;
      pnl = data.profitPoints;
    } else {
      // Synthesize a simple payoff curve from maxProfit / maxLoss
      const points = 100;
      prices = Array.from({ length: points }, (_, i) => i);
      const mid = Math.floor(points / 2);
      pnl = prices.map((_, i) => {
        if (i < mid * 0.3) return maxLoss;
        if (i < mid * 0.7) return maxLoss + (maxProfit - maxLoss) * ((i - mid * 0.3) / (mid * 0.4));
        if (i < mid * 1.3) return maxProfit;
        if (i < mid * 1.7) return maxProfit - (maxProfit - maxLoss) * ((i - mid * 1.3) / (mid * 0.4));
        return maxLoss;
      });
    }

    if (pnl.length === 0) return;

    const pad = { top: 10, right: 10, bottom: 10, left: 10 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const minPnl = Math.min(...pnl, 0);
    const maxPnl = Math.max(...pnl, 0);
    const range = maxPnl - minPnl || 1;

    const toX = (i: number) => pad.left + (i / (pnl.length - 1)) * cw;
    const toY = (v: number) => pad.top + ch - ((v - minPnl) / range) * ch;
    const zeroY = toY(0);

    // Green fill above zero
    ctx.beginPath();
    ctx.moveTo(toX(0), zeroY);
    for (let i = 0; i < pnl.length; i++) {
      const y = Math.min(toY(pnl[i]), zeroY);
      ctx.lineTo(toX(i), y);
    }
    ctx.lineTo(toX(pnl.length - 1), zeroY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(102,187,106,0.2)';
    ctx.fill();

    // Red fill below zero
    ctx.beginPath();
    ctx.moveTo(toX(0), zeroY);
    for (let i = 0; i < pnl.length; i++) {
      const y = Math.max(toY(pnl[i]), zeroY);
      ctx.lineTo(toX(i), y);
    }
    ctx.lineTo(toX(pnl.length - 1), zeroY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(239,83,80,0.2)';
    ctx.fill();

    // Zero line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    ctx.lineTo(w - pad.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Payoff line
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < pnl.length; i++) {
      const x = toX(i);
      const y = toY(pnl[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Max profit label
    ctx.fillStyle = '#66bb6a';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`+$${maxProfit.toFixed(0)}`, w - pad.right, pad.top + 12);

    // Max loss label
    ctx.fillStyle = '#ef5350';
    ctx.fillText(`-$${Math.abs(maxLoss).toFixed(0)}`, w - pad.right, h - pad.bottom - 4);
  }, [data, maxProfit, maxLoss]);

  return <canvas ref={canvasRef} style={{ borderRadius: '6px', backgroundColor: 'rgba(9,16,31,0.5)', border: '1px solid rgba(255,255,255,0.06)' }} />;
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
      <h1 className="text-3xl font-bold mb-6 text-white">Multi-Leg Strategies</h1>
      <p className="text-slate-400 mb-6">
        Build and analyze multi-leg options strategies including spreads, iron condors, butterflies, and custom combinations.
      </p>

      {/* Strategy Scanner Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-white">Strategy Scanner</h2>
        <FilterPanel title="Scan Filters" showActions={false}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Ticker Symbol
              </label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-white/10 rounded-md bg-[#0b1224] text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="SPY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Strategy Type
              </label>
              <select
                value={strategyType}
                onChange={(e) => setStrategyType(e.target.value as any)}
                className="w-full px-3 py-2 border border-white/10 rounded-md bg-[#0b1224] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="iron_condor">Iron Condor</option>
                <option value="vertical_spread">Vertical Spread</option>
                <option value="calendar_spread">Calendar Spread</option>
                <option value="butterfly">Butterfly</option>
                <option value="diagonal_spread">Diagonal Spread</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
                className="w-full accent-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
                className="w-full accent-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
                className="w-full accent-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Max Buying Power: ${filters.maxBuyingPower}
              </label>
              <input
                type="number"
                value={filters.maxBuyingPower}
                onChange={(e) =>
                  setFilters({ ...filters, maxBuyingPower: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-white/10 rounded-md bg-[#0b1224] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                step="500"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleScan}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Scanning...' : 'Scan for Strategies'}
            </button>
          </div>
        </FilterPanel>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-md text-red-400">
            {error}
          </div>
        )}

        {scanResults.length > 0 && (
          <div className="mt-4 bg-[#0f1a2e] border border-white/10 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-white/5 border-b border-white/10 font-medium text-white">
              Scan Results ({scanResults.length})
            </div>
            <div className="divide-y divide-white/5">
              {scanResults.map((result, index) => (
                <div key={index} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-cyan-400">
                        {result.strategyType.replace(/_/g, ' ').toUpperCase()}
                      </h3>
                      <div className="text-sm text-slate-400">
                        {result.legs.length} legs &bull; {result.probability}% probability
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-emerald-400">
                        ${result.netCredit.toFixed(2)} Credit
                      </div>
                      <div className="text-xs text-slate-400">
                        Max P/L: <span className="text-emerald-400">${result.maxProfit}</span> / <span className="text-red-400">${result.maxLoss}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="flex-1">
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        {result.legs.map((leg, legIndex) => (
                          <div key={legIndex} className="bg-white/5 p-2 rounded border border-white/5">
                            <div className="font-medium text-slate-200">{leg.type.toUpperCase()}</div>
                            <div className="text-slate-400">
                              ${leg.strike} @ ${leg.premium}
                            </div>
                          </div>
                        ))}
                      </div>
                      {result.breakevens.length > 0 && (
                        <div className="mt-2 text-sm text-slate-400">
                          Breakevens: {result.breakevens.map((b) => `$${b.toFixed(2)}`).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <MiniPayoutCanvas data={result.payoutChart} maxProfit={result.maxProfit} maxLoss={result.maxLoss} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manual Strategy Builder Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-white">Manual Strategy Builder</h2>
        <StrategyBuilder />
      </div>
    </div>
  );
}
