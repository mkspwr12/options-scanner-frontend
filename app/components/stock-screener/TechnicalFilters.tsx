import React from 'react';

export interface TechnicalFilters {
  rsi: { min: number; max: number };
  macdBullish: boolean;
  above50MA: boolean;
  above200MA: boolean;
  unusualVolume: boolean;
}

interface TechnicalFiltersProps {
  filters: TechnicalFilters;
  onChange: React.Dispatch<React.SetStateAction<TechnicalFilters>>;
}

export function TechnicalFilters({ filters, onChange }: TechnicalFiltersProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          RSI Range
        </label>
        <div className="flex gap-4 items-center">
          <input
            type="number"
            value={filters.rsi.min}
            onChange={(e) => onChange({ ...filters, rsi: { ...filters.rsi, min: Number(e.target.value) } })}
            className="w-20 px-3 py-2 border border-gray-300 rounded-md"
            min="0"
            max="100"
          />
          <span className="text-gray-500">to</span>
          <input
            type="number"
            value={filters.rsi.max}
            onChange={(e) => onChange({ ...filters, rsi: { ...filters.rsi, max: Number(e.target.value) } })}
            className="w-20 px-3 py-2 border border-gray-300 rounded-md"
            min="0"
            max="100"
          />
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.rsi.max}
          onChange={(e) => onChange({ ...filters, rsi: { ...filters.rsi, max: Number(e.target.value) } })}
          className="w-full mt-2"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.macdBullish}
            onChange={(e) => onChange({ ...filters, macdBullish: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">MACD Bullish Crossover</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.above50MA}
            onChange={(e) => onChange({ ...filters, above50MA: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Above 50-Day MA</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.above200MA}
            onChange={(e) => onChange({ ...filters, above200MA: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Above 200-Day MA</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.unusualVolume}
            onChange={(e) => onChange({ ...filters, unusualVolume: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Unusual Volume (2x+ avg)</span>
        </label>
      </div>
    </div>
  );
}
