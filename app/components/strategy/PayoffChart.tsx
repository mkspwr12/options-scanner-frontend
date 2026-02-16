'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import type { PayoffPoint, StrategyMetrics } from '../../types/strategy';
import { calculatePayoffCurve, calculateMetrics } from '../../utils/blackScholes';
import { useStrategyContext } from './StrategyContext';
import styles from '../../styles/strategy.module.css';

const CHART_PADDING = { top: 20, right: 20, bottom: 40, left: 60 };
const BREAK_EVEN_RADIUS = 5;

/**
 * Canvas-based payoff diagram rendered at expiration.
 * Price range: underlying ± 30%.
 * Green fill above zero, red fill below zero.
 */
export function PayoffChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state } = useStrategyContext();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = 320;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (state.legs.length === 0 || state.underlyingPrice <= 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Add legs and set underlying price to see payoff', width / 2, height / 2);
      return;
    }

    const price = state.underlyingPrice;
    const range: [number, number] = [price * 0.7, price * 1.3];
    const steps = 200;
    const curve = calculatePayoffCurve(state.legs, range, steps);
    const metrics = calculateMetrics(state.legs, price);

    const plotW = width - CHART_PADDING.left - CHART_PADDING.right;
    const plotH = height - CHART_PADDING.top - CHART_PADDING.bottom;

    // Find data bounds
    let minProfit = Infinity;
    let maxProfit = -Infinity;
    for (const pt of curve) {
      if (pt.profit < minProfit) minProfit = pt.profit;
      if (pt.profit > maxProfit) maxProfit = pt.profit;
    }
    // Ensure zero is visible
    if (minProfit > 0) minProfit = 0;
    if (maxProfit < 0) maxProfit = 0;
    const profitRange = maxProfit - minProfit || 1;

    const toX = (p: number) => CHART_PADDING.left + ((p - range[0]) / (range[1] - range[0])) * plotW;
    const toY = (v: number) => CHART_PADDING.top + plotH - ((v - minProfit) / profitRange) * plotH;

    // Zero line
    const zeroY = toY(0);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(CHART_PADDING.left, zeroY);
    ctx.lineTo(width - CHART_PADDING.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Fill regions above/below zero
    // Green fill (profit)
    ctx.beginPath();
    ctx.moveTo(toX(curve[0].price), zeroY);
    for (const pt of curve) {
      const y = Math.min(toY(pt.profit), zeroY);
      ctx.lineTo(toX(pt.price), y);
    }
    ctx.lineTo(toX(curve[curve.length - 1].price), zeroY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(102, 187, 106, 0.15)';
    ctx.fill();

    // Red fill (loss)
    ctx.beginPath();
    ctx.moveTo(toX(curve[0].price), zeroY);
    for (const pt of curve) {
      const y = Math.max(toY(pt.profit), zeroY);
      ctx.lineTo(toX(pt.price), y);
    }
    ctx.lineTo(toX(curve[curve.length - 1].price), zeroY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(239, 83, 80, 0.15)';
    ctx.fill();

    // Payoff line
    ctx.beginPath();
    ctx.moveTo(toX(curve[0].price), toY(curve[0].profit));
    for (let i = 1; i < curve.length; i++) {
      ctx.lineTo(toX(curve[i].price), toY(curve[i].profit));
    }
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Max profit dashed line
    if (typeof metrics.maxProfit === 'number' && metrics.maxProfit > 0) {
      ctx.setLineDash([6, 3]);
      ctx.strokeStyle = 'rgba(102, 187, 106, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CHART_PADDING.left, toY(metrics.maxProfit));
      ctx.lineTo(width - CHART_PADDING.right, toY(metrics.maxProfit));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Max loss dashed line
    if (typeof metrics.maxLoss === 'number' && metrics.maxLoss < 0) {
      ctx.setLineDash([6, 3]);
      ctx.strokeStyle = 'rgba(239, 83, 80, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CHART_PADDING.left, toY(metrics.maxLoss));
      ctx.lineTo(width - CHART_PADDING.right, toY(metrics.maxLoss));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Break-even points
    ctx.fillStyle = '#f5a623';
    for (const be of metrics.breakEvenPoints) {
      if (be >= range[0] && be <= range[1]) {
        ctx.beginPath();
        ctx.arc(toX(be), zeroY, BREAK_EVEN_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Axes labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';

    // X-axis labels
    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const p = range[0] + (i / xTicks) * (range[1] - range[0]);
      ctx.fillText(`$${p.toFixed(0)}`, toX(p), height - 8);
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const v = minProfit + (i / yTicks) * profitRange;
      ctx.fillText(`$${v.toFixed(0)}`, CHART_PADDING.left - 8, toY(v) + 4);
    }

    // Axis titles
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '12px JetBrains Mono, monospace';
    ctx.fillText('Underlying Price', width / 2, height - 0);
    ctx.save();
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('P / L', 0, 0);
    ctx.restore();
  }, [state.legs, state.underlyingPrice]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div ref={containerRef} className={styles.chartContainer}>
      <canvas ref={canvasRef} className={styles.chart} />
    </div>
  );
}
