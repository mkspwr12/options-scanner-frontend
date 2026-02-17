import React from 'react';

interface MiniPayoutChartProps {
  prices: number[];
  pnl: number[];
}

export function MiniPayoutChart({ prices, pnl }: MiniPayoutChartProps) {
  if (!prices.length || !pnl.length) {
    return <div className="w-24 h-8 bg-gray-100 rounded" />;
  }

  const minPnl = Math.min(...pnl);
  const maxPnl = Math.max(...pnl);
  const range = maxPnl - minPnl || 1;

  const points = pnl.map((value, index) => {
    const x = (index / (pnl.length - 1)) * 100;
    const y = 100 - ((value - minPnl) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const isPositive = pnl[Math.floor(pnl.length / 2)] >= 0;

  return (
    <svg 
      width="100" 
      height="30" 
      viewBox="0 0 100 100" 
      className="inline-block"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? '#10b981' : '#ef4444'}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
