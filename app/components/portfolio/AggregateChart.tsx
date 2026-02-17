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
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Portfolio Analysis</h2>
      
      {/* Aggregate Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Total Positions</div>
          <div className="text-2xl font-bold">{positions.length}</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Total Value</div>
          <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Aggregate P&L</div>
          <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalPnL.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Strategy Breakdown */}
      <div>
        <h3 className="text-lg font-medium mb-3">By Strategy</h3>
        <div className="space-y-3">
          {Object.entries(strategyGroups).map(([strategy, data]) => (
            <div key={strategy} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">{strategy}</div>
                <div className="text-sm text-gray-500">{data.count} position{data.count !== 1 ? 's' : ''}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">${data.value.toFixed(2)}</div>
                <div className={`text-sm ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {positions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No positions to analyze
        </div>
      )}
    </div>
  );
}
