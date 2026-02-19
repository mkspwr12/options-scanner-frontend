'use client';

import { useEffect, useRef, useMemo } from 'react';

interface PayoutChartProps {
  chartData: { prices: number[]; pnl: number[] };
  maxProfit: number;
  maxLoss: number;
  breakEvenPrices: number[];
  width?: number;
  height?: number;
}

export function PayoutChart({
  chartData,
  maxProfit,
  maxLoss,
  breakEvenPrices,
  width = 800,
  height = 400,
}: PayoutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const chartKey = useMemo(
    () => JSON.stringify({ chartData, maxProfit, maxLoss, breakEvenPrices }),
    [chartData, maxProfit, maxLoss, breakEvenPrices]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (!chartData.pnl.length || !chartData.prices.length) return;

    const padding = { top: 40, right: 60, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const minPnl = Math.min(...chartData.pnl);
    const maxPnl = Math.max(...chartData.pnl);
    const pnlRange = maxPnl - minPnl || 1;

    const minPrice = Math.min(...chartData.prices);
    const maxPrice = Math.max(...chartData.prices);

    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Draw zero line
    const zeroY =
      height - padding.bottom - ((0 - minPnl) / pnlRange) * chartHeight;
    ctx.strokeStyle = '#9ca3af';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(width - padding.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw profit zone (green gradient)
    if (maxPnl > 0) {
      const gradient = ctx.createLinearGradient(0, padding.top, 0, zeroY);
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.2)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0.05)');
      ctx.fillStyle = gradient;
      ctx.fillRect(padding.left, padding.top, chartWidth, zeroY - padding.top);
    }

    // Draw loss zone (red gradient)
    if (minPnl < 0) {
      const gradient = ctx.createLinearGradient(0, zeroY, 0, height - padding.bottom);
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.05)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0.2)');
      ctx.fillStyle = gradient;
      ctx.fillRect(
        padding.left,
        zeroY,
        chartWidth,
        height - padding.bottom - zeroY
      );
    }

    // Draw breakeven lines
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    breakEvenPrices.forEach((price) => {
      const x =
        padding.left +
        ((price - minPrice) / (maxPrice - minPrice)) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();

      ctx.fillStyle = '#6366f1';
      ctx.font = '12px sans-serif';
      ctx.fillText(`BE: $${price.toFixed(2)}`, x + 5, padding.top + 15);
    });
    ctx.setLineDash([]);

    // Draw P&L curve
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();

    chartData.pnl.forEach((p, i) => {
      const x =
        padding.left +
        (i / (chartData.pnl.length - 1)) * chartWidth;
      const y =
        height - padding.bottom - ((p - minPnl) / pnlRange) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw labels
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px sans-serif';

    // Max profit label
    ctx.fillText(
      `Max Profit: $${maxProfit.toFixed(2)}`,
      width - padding.right - 120,
      padding.top
    );

    // Max loss label
    ctx.fillText(
      `Max Loss: $${Math.abs(maxLoss).toFixed(2)}`,
      width - padding.right - 120,
      height - padding.bottom + 30
    );

    // Price labels
    ctx.font = '12px sans-serif';
    ctx.fillText(`$${minPrice.toFixed(0)}`, padding.left, height - padding.bottom + 20);
    ctx.fillText(
      `$${maxPrice.toFixed(0)}`,
      width - padding.right - 30,
      height - padding.bottom + 20
    );
  }, [chartKey, width, height]);

  // Calculate ARIA label for accessibility
  const ariaLabel = `Strategy P&L chart: Maximum profit $${maxProfit.toFixed(2)}, Maximum loss $${Math.abs(maxLoss).toFixed(2)}, ${breakEvenPrices.length} breakeven point(s) at $${breakEvenPrices.map(p => p.toFixed(2)).join(', $')}`;

  return (
    <div className="bg-[#0f1a2e] border border-white/10 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-white">Strategy P&L Chart</h3>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="mx-auto"
      />
    </div>
  );
}
