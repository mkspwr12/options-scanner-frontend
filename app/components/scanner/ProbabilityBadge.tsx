import React from 'react';

interface ProbabilityBadgeProps {
  probability: number;
}

export function ProbabilityBadge({ probability }: ProbabilityBadgeProps) {
  const getColorClasses = () => {
    if (probability >= 70) {
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    } else if (probability >= 50) {
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    } else {
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColorClasses()}`}>
      {probability.toFixed(1)}%
    </span>
  );
}
