// Types for the Advanced Filtering & Screening System (Issue #2)
// See SPEC-2.md Section 4.1 for the full type diagram

/** State for all filter controls */
export interface FilterState {
  ivPercentile: [number, number];
  dte: number[] | 'custom';
  dteCustom: number | null;
  volumeOIRatio: [number, number];
  delta: [number, number];
  theta: [number, number];
  vega: [number, number];
  optionType: 'all' | 'call' | 'put';
  moneyness: 'all' | 'itm' | 'atm' | 'otm';
  minVolume: number | null;
}

/** Saved filter configuration */
export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: number;
}

/** Single scan result row from /api/scan */
export interface ScanResult {
  symbol: string;
  optionType: 'call' | 'put';
  strike: number;
  expiration: string;
  dte: number;
  ivPercentile: number;
  volume: number;
  openInterest: number;
  volumeOIRatio: number;
  delta: number;
  theta: number;
  vega: number;
  gamma: number;
  bid: number;
  ask: number;
  last: number;
  underlyingPrice: number;
}

/** API response from /api/scan */
export interface ScanResponse {
  results: ScanResult[];
  totalCount: number;
  filteredCount: number;
  cacheAgeSeconds: number;
  dataDelayMinutes: number;
}

/** All possible reducer actions */
export type FilterAction =
  | { type: 'SET_FILTER'; payload: Partial<FilterState> }
  | { type: 'RESET_FILTERS' }
  | { type: 'LOAD_PRESET'; payload: string }
  | { type: 'SAVE_PRESET'; payload: string }
  | { type: 'DELETE_PRESET'; payload: string }
  | { type: 'SET_RESULTS'; payload: ScanResponse }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

/** Full context state (filters + presets + results + UI) */
export interface FilterContextState {
  filters: FilterState;
  presets: FilterPreset[];
  activePresetId: string | null;
  results: ScanResult[];
  totalCount: number;
  filteredCount: number;
  isLoading: boolean;
  error: string | null;
  cacheAgeSeconds: number;
}

/** Sort configuration for results table */
export interface SortConfig {
  field: keyof ScanResult;
  direction: 'asc' | 'desc';
}

/** Filter range definition for UI generation */
export interface FilterRangeConfig {
  key: keyof FilterState;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  tooltip: string;
}
