import React from 'react';

export interface MomentumFilters {
  insiderBuying: boolean;
  earningsWithinDays: number | null;
  volumeSpike: { min: number; max: number };
}

interface MomentumFiltersProps {
  filters: MomentumFilters;
  onChange: React.Dispatch<React.SetStateAction<MomentumFilters>>;
}

export function MomentumFilters({ filters, onChange }: MomentumFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.insiderBuying}
            onChange={(e) => onChange({ ...filters, insiderBuying: e.target.checked })}
            className="rounded border-white/20 bg-[#0b1224] accent-blue-500"
          />
          <span className="text-sm text-slate-300">Recent Insider Buying (Last 30 Days)</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Earnings Announcement
        </label>
        <select
          value={filters.earningsWithinDays ?? ''}
          onChange={(e) => onChange({ ...filters, earningsWithinDays: e.target.value ? Number(e.target.value) : null })}
          className="w-full px-3 py-2 border border-white/10 rounded-md bg-[#0b1224] text-white outline-none focus:border-blue-500"
        >
          <option value="">No filter</option>
          <option value="7">Within 7 days</option>
          <option value="14">Within 14 days</option>
          <option value="30">Within 30 days</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Volume Spike (vs. 20-day avg)
        </label>
        <div className="flex gap-4 items-center">
          <input
            type="number"
            value={filters.volumeSpike.min}
            onChange={(e) => onChange({ ...filters, volumeSpike: { ...filters.volumeSpike, min: Number(e.target.value) } })}
            className="w-20 px-3 py-2 border border-white/10 rounded-md bg-[#0b1224] text-white outline-none focus:border-blue-500"
            min="1"
            max="10"
            step="0.5"
          />
          <span className="text-slate-500">to</span>
          <input
            type="number"
            value={filters.volumeSpike.max}
            onChange={(e) => onChange({ ...filters, volumeSpike: { ...filters.volumeSpike, max: Number(e.target.value) } })}
            className="w-20 px-3 py-2 border border-white/10 rounded-md bg-[#0b1224] text-white outline-none focus:border-blue-500"
            min="1"
            max="10"
            step="0.5"
          />
          <span className="text-slate-500">x</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={filters.volumeSpike.max}
          onChange={(e) => onChange({ ...filters, volumeSpike: { ...filters.volumeSpike, max: Number(e.target.value) } })}
          className="w-full mt-2 accent-blue-500"
        />
      </div>
    </div>
  );
}
