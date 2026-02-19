import React, { ReactNode } from 'react';

interface FilterPanelProps {
  title: string;
  children: ReactNode;
  onReset?: () => void;
  showActions?: boolean;
}

export function FilterPanel({ title, children, onReset, showActions = true }: FilterPanelProps) {
  return (
    <div className="bg-[#0f1a2e] border border-white/10 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {showActions && onReset && (
          <button
            onClick={onReset}
            className="px-3 py-1 text-sm text-slate-300 border border-white/10 rounded hover:bg-white/5 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
