import React from 'react';

interface PLSummaryProps {
  totalPL: number;
  totalPLPercent: number;
  maxProfit: number;
  maxLoss: number;
}

export function PLSummary({ totalPL, totalPLPercent, maxProfit, maxLoss }: PLSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-500 mb-1">Total P&L</div>
        <div className={`text-2xl font-bold ${totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${totalPL.toFixed(2)}
        </div>
        <div className={`text-sm ${totalPLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-500 mb-1">Portfolio Value</div>
        <div className="text-2xl font-bold text-gray-900">
          ${maxProfit.toFixed(2)}
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-500 mb-1">Cost Basis</div>
        <div className="text-2xl font-bold text-gray-900">
          ${maxLoss.toFixed(2)}
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-500 mb-1">Return on Investment</div>
        <div className={`text-2xl font-bold ${totalPLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {totalPLPercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
