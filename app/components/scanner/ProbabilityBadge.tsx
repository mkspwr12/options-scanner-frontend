import React from 'react';

interface ProbabilityBadgeProps {
  probability: number;
}

export function ProbabilityBadge({ probability }: ProbabilityBadgeProps) {
  const getColorClasses = () => {
    if (probability >= 70) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (probability >= 50) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else {
      return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColorClasses()}`}>
      {probability.toFixed(1)}%
    </span>
  );
}
