import React, { ReactNode } from 'react';

interface FilterPanelProps {
  title: string;
  children: ReactNode;
  onReset?: () => void;
  showActions?: boolean;
}

export function FilterPanel({ title, children, onReset, showActions = true }: FilterPanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {showActions && onReset && (
          <button
            onClick={onReset}
            className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Reset
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
