import React from 'react';

export interface FundamentalFilters {
  peRatio: { min: number; max: number };
  marketCap: 'all' | 'small' | 'mid' | 'large' | 'mega';
  earningsGrowth: { min: number; max: number };
}

interface FundamentalFiltersProps {
  filters: FundamentalFilters;
  onChange: React.Dispatch<React.SetStateAction<FundamentalFilters>>;
}

export function FundamentalFilters({ filters, onChange }: FundamentalFiltersProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          P/E Ratio Range
        </label>
        <div className="flex gap-4 items-center">
          <input
            type="number"
            value={filters.peRatio.min}
            onChange={(e) => onChange({ ...filters, peRatio: { ...filters.peRatio, min: Number(e.target.value) } })}
            className="w-20 px-3 py-2 border border-white/10 rounded-md bg-[#0b1224] text-white outline-none focus:border-blue-500"
            min="0"
          />
          <span className="text-slate-500">to</span>
          <input
            type="number"
            value={filters.peRatio.max}
            onChange={(e) => onChange({ ...filters, peRatio: { ...filters.peRatio, max: Number(e.target.value) } })}
            className="w-20 px-3 py-2 border border-white/10 rounded-md bg-[#0b1224] text-white outline-none focus:border-blue-500"
            min="0"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Market Cap
        </label>
        <select
          value={filters.marketCap}
          onChange={(e) => onChange({ ...filters, marketCap: e.target.value as FundamentalFilters['marketCap'] })}
          className="w-full px-3 py-2 border border-white/10 rounded-md bg-[#0b1224] text-white outline-none focus:border-blue-500"
        >
          <option value="all">All</option>
          <option value="small">Small Cap (&lt;$2B)</option>
          <option value="mid">Mid Cap ($2B-$10B)</option>
          <option value="large">Large Cap ($10B-$200B)</option>
          <option value="mega">Mega Cap (&gt;$200B)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Earnings Growth % (YoY)
        </label>
        <div className="flex gap-4 items-center">
          <input
            type="number"
            value={filters.earningsGrowth.min}
            onChange={(e) => onChange({ ...filters, earningsGrowth: { ...filters.earningsGrowth, min: Number(e.target.value) } })}
            className="w-20 px-3 py-2 border border-white/10 rounded-md bg-[#0b1224] text-white outline-none focus:border-blue-500"
            step="5"
          />
          <span className="text-slate-500">to</span>
          <input
            type="number"
            value={filters.earningsGrowth.max}
            onChange={(e) => onChange({ ...filters, earningsGrowth: { ...filters.earningsGrowth, max: Number(e.target.value) } })}
            className="w-20 px-3 py-2 border border-white/10 rounded-md bg-[#0b1224] text-white outline-none focus:border-blue-500"
            step="5"
          />
        </div>
      </div>
    </div>
  );
}
