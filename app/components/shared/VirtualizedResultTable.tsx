import React, { ReactNode } from 'react';

interface VirtualizedResultTableProps<T> {
  data: T[];
  rowHeight: number;
  height: number;
  renderRow: (item: T, index: number) => ReactNode;
  getRowKey: (item: T, index: number) => string;
}

export function VirtualizedResultTable<T>({
  data,
  rowHeight,
  height,
  renderRow,
  getRowKey,
}: VirtualizedResultTableProps<T>) {
  return (
    <div 
      className="border border-white/10 rounded-lg overflow-auto bg-[#0f1a2e]"
      style={{ height: `${height}px` }}
    >
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-full text-slate-500">
          No results to display
        </div>
      ) : (
        <div>
          {data.map((item, index) => (
            <div
              key={getRowKey(item, index)}
              style={{ minHeight: `${rowHeight}px` }}
              className="border-b border-white/5 last:border-b-0"
            >
              {renderRow(item, index)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
