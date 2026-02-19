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
      <div className="bg-[#0f1a2e] border border-white/10 border-t-2 border-t-blue-400 rounded-xl p-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total P&L</div>
        <div className={`text-2xl font-bold ${totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)}
        </div>
        <div className={`text-sm ${totalPLPercent >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
          {totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
        </div>
      </div>
      
      <div className="bg-[#0f1a2e] border border-white/10 border-t-2 border-t-cyan-400 rounded-xl p-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Portfolio Value</div>
        <div className="text-2xl font-bold text-white">
          ${maxProfit.toFixed(2)}
        </div>
      </div>
      
      <div className="bg-[#0f1a2e] border border-white/10 border-t-2 border-t-violet-400 rounded-xl p-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Cost Basis</div>
        <div className="text-2xl font-bold text-white">
          ${maxLoss.toFixed(2)}
        </div>
      </div>
      
      <div className="bg-[#0f1a2e] border border-white/10 border-t-2 border-t-amber-400 rounded-xl p-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Return on Investment</div>
        <div className={`text-2xl font-bold ${totalPLPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
