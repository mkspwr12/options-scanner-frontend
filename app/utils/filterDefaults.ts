// Default filter values and constants
// See SPEC-2.md Section 4.2 for the default values table
import type { FilterState, FilterRangeConfig } from '../types/scanner';

/** Default filter state — all ranges at maximum width (no filtering) */
export const DEFAULT_FILTERS: FilterState = {
  ivPercentile: [0, 100],
  dte: [0, 365],
  dteCustom: null,
  volumeOIRatio: [0.5, 10.0],
  delta: [-1.0, 1.0],
  theta: [-0.50, 0],
  vega: [0, 2.0],
  optionType: 'all',
  moneyness: 'all',
  minVolume: null,
};

/** Quick-select DTE chip values */
export const DTE_CHIP_VALUES = [7, 14, 30, 45, 60, 90, 180, 365] as const;

/** Filter range configurations for generating filter UI */
export const FILTER_RANGES: FilterRangeConfig[] = [
  {
    key: 'ivPercentile',
    label: 'IV Percentile',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'IV Percentile measures current implied volatility relative to its past year range. High values (>60%) suggest options are expensive; low values (<30%) suggest they are cheap.',
  },
  {
    key: 'volumeOIRatio',
    label: 'Volume / OI',
    min: 0.5,
    max: 10.0,
    step: 0.1,
    unit: '×',
    tooltip: 'Volume/Open Interest ratio measures trading activity. Values above 2× indicate unusual activity — potential institutional interest or upcoming catalysts.',
  },
  {
    key: 'delta',
    label: 'Delta',
    min: -1.0,
    max: 1.0,
    step: 0.05,
    unit: 'Δ',
    tooltip: 'Delta measures the expected change in option price for a $1 move in the underlying. Positive for calls, negative for puts. |Delta| ≈ probability of expiring ITM.',
  },
  {
    key: 'theta',
    label: 'Theta',
    min: -0.50,
    max: 0,
    step: 0.01,
    unit: '$/day',
    tooltip: 'Theta represents time decay — how much value an option loses per day. Typically negative for option buyers. Higher absolute values mean faster decay.',
  },
  {
    key: 'vega',
    label: 'Vega',
    min: 0,
    max: 2.0,
    step: 0.05,
    unit: '$/1%IV',
    tooltip: 'Vega measures sensitivity to implied volatility changes. A vega of 0.10 means the option price changes $0.10 for each 1% change in IV.',
  },
];

/** localStorage key for presets */
export const PRESETS_STORAGE_KEY = 'options-scanner-filter-presets';

/** Maximum number of saved presets */
export const MAX_PRESETS = 5;

/** Debounce delay for filter changes (ms) */
export const FILTER_DEBOUNCE_MS = 200;

/** Cache TTL for scan results (ms) */
export const CACHE_TTL_MS = 60_000;

/** Max cache entries */
export const MAX_CACHE_ENTRIES = 20;
