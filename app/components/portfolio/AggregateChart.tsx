import React from 'react';

interface PositionData {
  id: string;
  symbol: string;
  strategy: string;
  legs: string;
  costBasis: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  sparklineData: number[];
}

interface AggregateChartProps {
  positions: PositionData[];
}

export function AggregateChart({ positions }: AggregateChartProps) {
  // Calculate aggregate metrics
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.costBasis, 0);
  const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
  
  // Group by strategy
  const strategyGroups = positions.reduce((acc, p) => {
    const strategy = p.strategy || 'Other';
    if (!acc[strategy]) {
      acc[strategy] = { count: 0, value: 0, pnl: 0 };
    }
    acc[strategy].count += 1;
    acc[strategy].value += p.currentValue;
    acc[strategy].pnl += p.pnl;
    return acc;
  }, {} as Record<string, { count: number; value: number; pnl: number }>);

  return (
    <div className="bg-[#0f1a2e] border border-white/10 rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Portfolio Analysis</h2>
      
      {/* Aggregate Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white/5 border border-white/5 rounded-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Positions</div>
          <div className="text-2xl font-bold text-white">{positions.length}</div>
        </div>
        <div className="p-4 bg-white/5 border border-white/5 rounded-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Value</div>
          <div className="text-2xl font-bold text-white">${totalValue.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white/5 border border-white/5 rounded-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Aggregate P&L</div>
          <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Strategy Breakdown */}
      <div>
        <h3 className="text-lg font-medium mb-3 text-slate-200">By Strategy</h3>
        <div className="space-y-3">
          {Object.entries(strategyGroups).map(([strategy, data]) => (
            <div key={strategy} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/[0.07] transition-colors">
              <div>
                <div className="font-medium text-slate-200">{strategy}</div>
                <div className="text-sm text-slate-400">{data.count} position{data.count !== 1 ? 's' : ''}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-white">${data.value.toFixed(2)}</div>
                <div className={`text-sm ${data.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {positions.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No positions to analyze
        </div>
      )}
    </div>
  );
}
