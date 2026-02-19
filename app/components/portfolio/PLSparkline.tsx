'use client';

import { useEffect, useRef, useMemo } from 'react';

interface PLSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function PLSparkline({
  data,
  width = 100,
  height = 24,
  color,
}: PLSparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sparklineColor = useMemo(() => {
    if (color) return color;
    const current = data[data.length - 1] || 0;
    return current >= 0 ? '#22c55e' : '#ef4444';
  }, [data, color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const valueRange = maxValue - minValue || 1;

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, sparklineColor + '40');
    gradient.addColorStop(1, sparklineColor + '10');

    ctx.beginPath();
    data.forEach((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - minValue) / valueRange) * height;

      if (i === 0) {
        ctx.moveTo(x, height);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.strokeStyle = sparklineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    data.forEach((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - minValue) / valueRange) * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [data, width, height, sparklineColor]);

  // Calculate ARIA label for accessibility
  const currentValue = data[data.length - 1] || 0;
  const trend = currentValue >= 0 ? 'positive' : 'negative';
  const ariaLabel = `30-day P&L sparkline showing ${trend} trend, current value $${currentValue.toFixed(2)}`;

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel}
      style={{ width: `${width}px`, height: `${height}px` }}
      className="inline-block"
    />
  );
}
