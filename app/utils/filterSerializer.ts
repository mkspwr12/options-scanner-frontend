// Serialize FilterState to URL query params and compute cache hash
// See SPEC-2.md Section 3.2 for query parameter mapping
import type { FilterState } from '../types/scanner';
import { DEFAULT_FILTERS } from './filterDefaults';

/**
 * Convert FilterState to URL query parameters.
 * Only includes parameters that differ from defaults (reduces URL length).
 */
export function serializeFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  // IV Percentile
  if (filters.ivPercentile[0] !== DEFAULT_FILTERS.ivPercentile[0]) {
    params.set('iv_min', String(filters.ivPercentile[0]));
  }
  if (filters.ivPercentile[1] !== DEFAULT_FILTERS.ivPercentile[1]) {
    params.set('iv_max', String(filters.ivPercentile[1]));
  }

  // DTE
  if (Array.isArray(filters.dte) && filters.dte.length === 2) {
    if (filters.dte[0] !== 0) params.set('dte_min', String(filters.dte[0]));
    if (filters.dte[1] !== 365) params.set('dte_max', String(filters.dte[1]));
  } else if (filters.dte === 'custom' && filters.dteCustom !== null) {
    params.set('dte_min', String(filters.dteCustom));
    params.set('dte_max', String(filters.dteCustom));
  }

  // Volume/OI
  if (filters.volumeOIRatio[0] !== DEFAULT_FILTERS.volumeOIRatio[0]) {
    params.set('vol_oi_min', String(filters.volumeOIRatio[0]));
  }
  if (filters.volumeOIRatio[1] !== DEFAULT_FILTERS.volumeOIRatio[1]) {
    params.set('vol_oi_max', String(filters.volumeOIRatio[1]));
  }

  // Delta
  if (filters.delta[0] !== DEFAULT_FILTERS.delta[0]) {
    params.set('delta_min', String(filters.delta[0]));
  }
  if (filters.delta[1] !== DEFAULT_FILTERS.delta[1]) {
    params.set('delta_max', String(filters.delta[1]));
  }

  // Theta
  if (filters.theta[0] !== DEFAULT_FILTERS.theta[0]) {
    params.set('theta_min', String(filters.theta[0]));
  }
  if (filters.theta[1] !== DEFAULT_FILTERS.theta[1]) {
    params.set('theta_max', String(filters.theta[1]));
  }

  // Vega
  if (filters.vega[0] !== DEFAULT_FILTERS.vega[0]) {
    params.set('vega_min', String(filters.vega[0]));
  }
  if (filters.vega[1] !== DEFAULT_FILTERS.vega[1]) {
    params.set('vega_max', String(filters.vega[1]));
  }

  // Enums
  if (filters.optionType !== 'all') {
    params.set('option_type', filters.optionType);
  }
  if (filters.moneyness !== 'all') {
    params.set('moneyness', filters.moneyness);
  }

  // Min volume
  if (filters.minVolume !== null && filters.minVolume > 0) {
    params.set('min_volume', String(filters.minVolume));
  }

  return params;
}

/**
 * Compute a simple hash string for a FilterState to use as cache key.
 */
export function hashFilters(filters: FilterState): string {
  const canonical = JSON.stringify(filters, Object.keys(filters).sort());
  // Simple djb2 hash — good enough for cache keys
  let hash = 5381;
  for (let i = 0; i < canonical.length; i++) {
    hash = ((hash << 5) + hash + canonical.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(36);
}

/**
 * Parse URL search params back into a partial FilterState.
 */
export function deserializeFilters(params: URLSearchParams): Partial<FilterState> {
  const partial: Partial<FilterState> = {};

  const ivMin = params.get('iv_min');
  const ivMax = params.get('iv_max');
  if (ivMin !== null || ivMax !== null) {
    partial.ivPercentile = [
      ivMin !== null ? clamp(Number(ivMin), 0, 100) : 0,
      ivMax !== null ? clamp(Number(ivMax), 0, 100) : 100,
    ];
  }

  const dteMin = params.get('dte_min');
  const dteMax = params.get('dte_max');
  if (dteMin !== null || dteMax !== null) {
    partial.dte = [
      dteMin !== null ? clamp(Number(dteMin), 0, 365) : 0,
      dteMax !== null ? clamp(Number(dteMax), 0, 365) : 365,
    ];
  }

  const voiMin = params.get('vol_oi_min');
  const voiMax = params.get('vol_oi_max');
  if (voiMin !== null || voiMax !== null) {
    partial.volumeOIRatio = [
      voiMin !== null ? clamp(Number(voiMin), 0.5, 10) : 0.5,
      voiMax !== null ? clamp(Number(voiMax), 0.5, 10) : 10,
    ];
  }

  const deltaMin = params.get('delta_min');
  const deltaMax = params.get('delta_max');
  if (deltaMin !== null || deltaMax !== null) {
    partial.delta = [
      deltaMin !== null ? clamp(Number(deltaMin), -1, 1) : -1,
      deltaMax !== null ? clamp(Number(deltaMax), -1, 1) : 1,
    ];
  }

  const thetaMin = params.get('theta_min');
  const thetaMax = params.get('theta_max');
  if (thetaMin !== null || thetaMax !== null) {
    partial.theta = [
      thetaMin !== null ? clamp(Number(thetaMin), -0.5, 0) : -0.5,
      thetaMax !== null ? clamp(Number(thetaMax), -0.5, 0) : 0,
    ];
  }

  const vegaMin = params.get('vega_min');
  const vegaMax = params.get('vega_max');
  if (vegaMin !== null || vegaMax !== null) {
    partial.vega = [
      vegaMin !== null ? clamp(Number(vegaMin), 0, 2) : 0,
      vegaMax !== null ? clamp(Number(vegaMax), 0, 2) : 2,
    ];
  }

  const optionType = params.get('option_type');
  if (optionType === 'call' || optionType === 'put') {
    partial.optionType = optionType;
  }

  const moneyness = params.get('moneyness');
  if (moneyness === 'itm' || moneyness === 'atm' || moneyness === 'otm') {
    partial.moneyness = moneyness;
  }

  const minVol = params.get('min_volume');
  if (minVol !== null) {
    const v = Number(minVol);
    if (!isNaN(v) && v > 0) partial.minVolume = v;
  }

  return partial;
}

/** Check if any filter differs from default */
export function hasActiveFilters(filters: FilterState): boolean {
  return JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
}

/** Count number of active (non-default) filters */
export function countActiveFilters(filters: FilterState): number {
  let count = 0;
  const d = DEFAULT_FILTERS;

  if (filters.ivPercentile[0] !== d.ivPercentile[0] || filters.ivPercentile[1] !== d.ivPercentile[1]) count++;
  if (JSON.stringify(filters.dte) !== JSON.stringify(d.dte)) count++;
  if (filters.volumeOIRatio[0] !== d.volumeOIRatio[0] || filters.volumeOIRatio[1] !== d.volumeOIRatio[1]) count++;
  if (filters.delta[0] !== d.delta[0] || filters.delta[1] !== d.delta[1]) count++;
  if (filters.theta[0] !== d.theta[0] || filters.theta[1] !== d.theta[1]) count++;
  if (filters.vega[0] !== d.vega[0] || filters.vega[1] !== d.vega[1]) count++;
  if (filters.optionType !== d.optionType) count++;
  if (filters.moneyness !== d.moneyness) count++;
  if (filters.minVolume !== null && filters.minVolume > 0) count++;

  return count;
}

function clamp(value: number, min: number, max: number): number {
  if (isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
