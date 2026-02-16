# Code Review — Issues #3, #4, #5, #6

**Reviewer**: Code Reviewer Agent  
**Date**: 2026-02-15  
**Codebase**: options-scanner-frontend (Next.js 14 / React 18 / TypeScript 5.5.4 strict)  
**tsconfig.json**: `"strict": true` confirmed  
**Compile Errors in Scope**: None (all TS/TSX files under review compile cleanly)

---

## Issue #5 — Yahoo Finance Data Integration

### PASS Items

- **Types (`yahoo-finance.ts`)**: Clean discriminated union for `DataAction`; no `any`; exhaustive `ConnectionState` union.
- **CircuitBreaker (`circuitBreaker.ts`)**: Proper class encapsulation; half-open probe logic correct; `getState()` returns immutable snapshot; configurable cooldown via constructor.
- **AbortController cleanup (`useOptionsChain.ts`)**: Aborts in-flight requests on ticker change and on unmount.
- **Cache with TTL (`useOptionsChain.ts`)**: 60s in-memory Map cache with manual bust on refetch — sensible for real-time data.
- **Rate-limit header parsing (`useOptionsChain.ts`)**: Reads `x-ratelimit-*` headers; degrades gracefully when headers are absent.
- **`useAutoRefresh.ts`**: Ref-based callback avoids stale closure; cleanup on disable/unmount.
- **`StaleDataBanner.tsx`**: Uses `role="alert"` and `aria-label` on dismiss button.
- **`DataFreshnessBar.tsx`**: Checkbox has associated `<label>` for accessibility.
- **`OptionsChainTable.tsx`**: `useMemo` for sorted contracts; skeleton loading state; proper `key` on rows.
- **`YahooDataSection.tsx`**: Good composition; ticker input sanitized (`trim().toUpperCase()`); submit disabled when empty.
- **`yahoo.module.css`**: Responsive breakpoints at 1024px and 768px; shimmer animation for skeletons; CSS custom property fallbacks throughout.

### WARN Items (should fix but not blocking)

- [useOptionsChain.ts:L90](app/hooks/useOptionsChain.ts#L90): `fetchChain` dependency on `rateLimit` state object causes unnecessary re-creation of the callback on every rate-limit header update the response. This cascading re-render can trigger a double-fetch. **Fix**: Remove `rateLimit` from the `useCallback` deps and read it via a ref instead, or use functional state update (`setRateLimit(prev => ...)`) to avoid capturing the current value.
- [useOptionsChain.ts:L24](app/hooks/useOptionsChain.ts#L24): Module-level singleton `chainCache` and `breaker` instances are shared across all component instances and survive HMR. This is intentional for caching but can leak state in tests. **Fix**: Consider a factory or context-scoped approach, or document the singleton behavior.
- [OptionsChainTable.tsx:L44](app/components/yahoo/OptionsChainTable.tsx#L44): `handleSort` is not wrapped in `useCallback`. It's recreated every render and passed implicitly to `<th onClick>`. **Fix**: Wrap in `useCallback` for consistency with project conventions (minor perf impact since headers are few).
- [OptionsChainTable.tsx:L70-L82](app/components/yahoo/OptionsChainTable.tsx#L70): Sortable `<th>` elements use `onClick` but lack `role="columnheader"` with `aria-sort`, `tabIndex={0}`, and `onKeyDown` (Enter/Space) for keyboard users. **Fix**: Add `tabIndex={0}`, `aria-sort="ascending|descending|none"`, and keyboard handler.
- [RateLimitIndicator.tsx:L30-L37](app/components/yahoo/RateLimitIndicator.tsx#L30): Progress bar div lacks `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` attributes. **Fix**: Add ARIA progressbar semantics.
- [ConnectionStatusBadge.tsx:L20](app/components/yahoo/ConnectionStatusBadge.tsx#L20): The outer `<span>` has no `role` or `aria-label` indicating it's a status indicator. Sighted users see the color dot, but screen readers only see the text "Connected". **Fix**: Add `role="status"` and `aria-live="polite"`.
- [YahooDataSection.tsx:L34](app/components/yahoo/YahooDataSection.tsx#L34): `handleSubmit` is not wrapped in `useCallback`. Minor since it's only used on the form element directly.

### FAIL Items (must fix before release)

- [useOptionsChain.ts:L57](app/hooks/useOptionsChain.ts#L57): `mapContract` casts raw values to numbers with `Number(raw.field ?? 0)`. If the API returns a string like `"N/A"` for any numeric field, `Number("N/A")` returns `NaN`, which will silently flow through the entire UI (chart, table, metrics). **Fix**: Add a `safeNumber` helper: `const safeNumber = (v: unknown, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };` and use it for all numeric mappings.
- [useOptionsChain.ts:L55](app/hooks/useOptionsChain.ts#L55): `mapChain` casts `json.contracts` to `Record<string, unknown>[]` with no runtime validation. A malformed API response (e.g. `contracts: "error"`) would cause `rawContracts.map(mapContract)` to throw at runtime with an obscure error. **Fix**: Add a guard: `Array.isArray(json.contracts) ? ... : []`.

**Verdict: APPROVED WITH CONDITIONS**  
Must fix the two FAIL items (NaN propagation, missing array guard). WARN items should be addressed in a follow-up PR.

---

## Issue #4 — Modular Data Provider Framework

### PASS Items

- **Types (`data-provider.ts`)**: Clean `IDataProvider` interface with explicit method contracts; `ProviderAction` uses proper discriminated unions; helpers (`DEFAULT_YAHOO_CONFIG`, `createDefaultHealth`) are well-placed alongside types.
- **ProviderFactory (`providerFactory.ts`)**: `encodeURIComponent(ticker)` for URL safety; `AbortController` with timeout; performance timing for latency; StubProvider throws descriptively; factory switch has `default` fallback.
- **`useProviderManager.ts`**: `useReducer` for complex state; `didLoad` ref prevents double-load in StrictMode; localStorage persistence; `useCallback` on all exposed actions.
- **`ProviderContext.tsx`**: Clean context + hook pattern with descriptive error on missing provider.
- **`ProviderCard.tsx`**: Priority arrows have `aria-label`; Remove button disabled when sole provider with explanatory `title`.
- **`ProviderFormModal.tsx`**: Form validation (name required, max length, rate limit minimum, timeout minimum); API key uses `type="password"` + `autoComplete="off"` (no plaintext exposure); Escape key closes modal; focus management via `requestAnimationFrame`.
- **`ConnectionTestButton.tsx`**: Timer cleanup on unmount; auto-reset after 3s.
- **`FailoverBanner.tsx`**: Conditional render when inactive; clean composition.
- **`ProviderSettingsSection.tsx`**: Sorted by priority via `useMemo`; all handlers `useCallback`-wrapped; modal state management correct.
- **`providers.module.css`**: Backdrop blur on modal; consistent design tokens.

### WARN Items (should fix but not blocking)

- [providerFactory.ts:L52](app/utils/providerFactory.ts#L52): `res.json()` result is cast with `return json as OptionsChain` — no runtime validation. A malformed backend response could silently produce an invalid `OptionsChain` object. **Fix**: Add a guard function or use Zod schema validation.
- [ProviderCard.tsx:L17](app/components/providers/ProviderCard.tsx#L17): `TYPE_ICONS` is typed as `Record<string, string>` instead of `Record<ProviderType, string>`. This weakens type safety — a typo in the key would not be caught. **Fix**: Change type to `Record<ProviderType, string>`.
- [ProviderFormModal.tsx:L104](app/components/providers/ProviderFormModal.tsx#L104): Modal overlay `<div>` is missing `role="dialog"` and `aria-modal="true"`. Screen readers won't trap focus or announce it as a dialog. **Fix**: Add `role="dialog"` and `aria-modal="true"` to `.modalOverlay` or `.modal` div.
- [ProviderFormModal.tsx:L104](app/components/providers/ProviderFormModal.tsx#L104): No focus trap inside modal. Tab key can escape to background content. **Fix**: Implement focus trap (e.g., a simple `focusTrap` hook or use `@radix-ui/react-dialog`).
- [FailoverBanner.tsx:L27](app/components/providers/FailoverBanner.tsx#L27): Missing `role="alert"` on the failover banner div. **Fix**: Add `role="alert"` so screen readers announce failover events.
- [useProviderManager.ts:L104-L118](app/hooks/useProviderManager.ts#L104): localStorage loading dispatches `ADD_PROVIDER` for each saved config, but the initial state already includes `DEFAULT_YAHOO_CONFIG`. If the user previously saved providers that don't include the default, the default persists alongside them as a duplicate. **Fix**: Replace the entire provider list on load rather than appending.
- [providerFactory.ts:L11](app/utils/providerFactory.ts#L11): `DEFAULT_API_BASE` is hardcoded duplicated across `providerFactory.ts`, `useOptionsChain.ts`, and `usePortfolio.ts`. **Fix**: Extract to a shared constants file.

### FAIL Items (must fix before release)

- [ProviderFormModal.tsx:L88-L95](app/components/providers/ProviderFormModal.tsx#L88): API key is stored in `ProviderConfig.apiKey` and persisted to `localStorage` via `useProviderManager.ts:L126`. This means API keys are stored in plaintext in the browser's localStorage — **a security concern**. **Fix**: Either (a) do not persist API keys to localStorage (require re-entry on page load), (b) encrypt before storage, or (c) store server-side and only reference by ID. At minimum, add a warning comment and strip API keys before `JSON.stringify` in the persistence effect.

**Verdict: APPROVED WITH CONDITIONS**  
Must fix the FAIL item (API key plaintext in localStorage). WARN items should be filed as follow-up issues.

---

## Issue #3 — Multi-Leg Options Strategy Builder

### PASS Items

- **Types (`strategy.ts`)**: Clean union types; `StrategyMetrics` uses `number | 'unlimited'` pattern; `StrategyBuilderState` has explicit wizard step type.
- **Black-Scholes (`blackScholes.ts`)**: Abramowitz & Stegun CDF approximation (max error ~1.5e-7) is appropriate for client-side; handles T ≤ 0 edge case for expired options; `legPayoff` correctly handles buy/sell multiplier; break-even detection via zero-crossing with linear interpolation; unlimited profit/loss detection via edge-slope comparison.
- **Strategy Templates (`strategyTemplates.ts`)**: Clean factory functions for bull-call, bear-put, iron-condor, straddle; proper use of `crypto.randomUUID` with deterministic fallback.
- **`useStrategyBuilder.ts`**: Standard reducer pattern; localStorage persistence for saved strategies; all actions have `useCallback` wrappers; `RESET` preserves saved strategies.
- **`StrategyContext.tsx`**: `ReturnType<typeof useStrategyBuilder>` avoids manual type duplication.
- **`TemplateSelector.tsx`**: Template cards are `<button>` elements (keyboard accessible); clean description text.
- **`LegEditor.tsx`**: Auto-populates template legs via `useEffect`; guards against re-application (`state.legs.length > 0`); input constraints (`min`, `step`).
- **`PayoffChart.tsx`**: Canvas HiDPI support (`devicePixelRatio`); resize listener with cleanup; green/red fill regions; break-even dots; max profit/loss dashed lines; handles empty state gracefully.
- **`StrategyMetricsPanel.tsx`**: `useMemo` for metrics computation; handles empty legs state.
- **`SavedStrategiesDrawer.tsx`**: Two-click delete confirmation; collapsible drawer.
- **`StrategyBuilderSection.tsx`**: Wizard step indicator with active/done/disabled visual states; clean composition with StrategyProvider wrapper.
- **`strategy.module.css`**: Responsive breakpoints; template grid collapses to single column on mobile; consistent design tokens.

### WARN Items (should fix but not blocking)

- [Multiple files: `uid()` duplication](app/utils/strategyTemplates.ts#L7): The `uid()` function is copy-pasted identically in `strategyTemplates.ts:L7`, `LegEditor.tsx:L15`, `StrategyBuilderSection.tsx:L17`, and `RiskThresholdConfig.tsx:L17`. **Fix**: Extract to `app/utils/uid.ts` and import everywhere.
- [PayoffChart.tsx:L136](app/components/strategy/PayoffChart.tsx#L136): The `<canvas>` element has no `aria-label` or fallback content for screen readers. Canvas content is completely invisible to assistive technology. **Fix**: Add `aria-label="Payoff diagram at expiration"` and consider adding a text summary of key metrics (max profit, max loss, break-evens) as a visually-hidden element.
- [LegEditor.tsx:L36](app/components/strategy/LegEditor.tsx#L36): The `// eslint-disable-next-line react-hooks/exhaustive-deps` suppression on `handleApplyTemplate` intentionally omits `applyTemplate` from deps to prevent re-running. This is correct behavior but lacks a comment explaining _why_ the suppression is needed. **Fix**: Add a comment: `// applyTemplate is stable (dispatch-based); omitting to avoid re-triggering template application`.
- [SavedStrategiesDrawer.tsx:L30](app/components/strategy/SavedStrategiesDrawer.tsx#L30): `templateLabel` uses `Record<string, string>` — should be `Record<StrategyTemplate, string>` for type safety. **Fix**: Import and use `StrategyTemplate`.
- [StrategyBuilderSection.tsx:L79](app/components/strategy/StrategyBuilderSection.tsx#L79): Step dots allow clicking on completed steps (`i <= currentStepIndex`) but disabled steps have `disabled` attribute without keyboard considerations. When a step dot is disabled, it still appears in the tab order. **Fix**: Add `tabIndex={-1}` when disabled, or use `aria-disabled="true"`.
- [blackScholes.ts:L87-L88](app/utils/blackScholes.ts#L87): `calculatePayoffCurve` does not validate that `priceRange[0] < priceRange[1]` or that `steps > 0`. Calling with invalid input would produce `NaN`-filled points. **Fix**: Add guard: `if (steps <= 0 || maxPrice <= minPrice) return [];`.
- [useStrategyBuilder.ts:L101](app/hooks/useStrategyBuilder.ts#L101): The hook exposes `dispatch` directly alongside the action creators. This allows consumers to bypass the typed action creators and dispatch arbitrary actions. **Fix**: Remove `dispatch` from the returned object — callers should use the named action functions.

### FAIL Items (must fix before release)

- None.

**Verdict: APPROVED**  
No blocking issues. WARN items should be addressed in a hardening pass.

---

## Issue #6 — Portfolio Risk Management

### PASS Items

- **Types (`portfolio.ts`)**: Clean interfaces; `RiskThreshold` uses string literal unions for `metric` and `operator`; imports `StrategyLeg` from strategy types for cross-feature consistency.
- **Risk Calculations (`riskCalculations.ts`)**: `aggregateGreeks` documents premium-as-proxy approach; `calculateSummary` handles `costBasis === 0` to avoid division by zero; `resolveMetric` is exhaustive over the union (TypeScript would flag a missing case); `isBreached` correctly implements all four operators; `detectStrategyType` provides reasonable heuristics.
- **`usePortfolio.ts`**: `useReducer` for complex state; `mountedRef` prevents state updates after unmount; API fetch with proper error handling; thresholds persisted to localStorage; summary recalculated reactively when positions change.
- **`PortfolioContext.tsx`**: Clean pattern, consistent with Issue #3 and #4 contexts.
- **`PortfolioSummaryCards.tsx`**: 8-card dashboard with skeleton loading; `Intl.NumberFormat` for currency formatting; color-coded P&L.
- **`PositionsTable.tsx`**: Sortable columns with `useMemo`; expandable leg detail rows; color-coded P&L; "Remove" button uses `e.stopPropagation()` to prevent row expansion toggle.
- **`RiskAlertBanner.tsx`**: Filters unacknowledged alerts; severity-based CSS classes; Clear All button; individual dismiss.
- **`RiskThresholdConfig.tsx`**: Add form with NaN validation; toggle enable/disable; delete threshold; operator display labels.
- **`StrategyGroupView.tsx`**: `useMemo` for grouping; `Set`-based expanded state; aggregated Greeks per group.
- **`PortfolioRiskSection.tsx`**: Tab navigation; auto-refresh with cleanup; error state with retry; clean composition with PortfolioProvider wrapper.
- **`portfolio.module.css`**: Comprehensive styling; toggle switch with CSS-only animation; responsive grid collapse; slide-in animation for alerts.

### WARN Items (should fix but not blocking)

- [usePortfolio.ts:L103-L115](app/hooks/usePortfolio.ts#L103): Threshold loading from localStorage dispatches `ADD_THRESHOLD` for each saved threshold, but `initialState` already includes `DEFAULT_THRESHOLDS`. This causes duplicates on every mount (3 defaults + N saved, then 3 defaults + N saved + N loaded). **Fix**: Replace the dispatch loop with a `SET_THRESHOLDS` action that replaces the entire array, or clear defaults before loading.
- [usePortfolio.ts:L119-L128](app/hooks/usePortfolio.ts#L119): `evaluateThresholds` runs on every `state.positions` or `state.thresholds` change and dispatches `TRIGGER_ALERT` for each breach. Since alerts accumulate (never cleared by this effect), every positions update adds duplicate alerts for the same threshold breach. **Fix**: Either (a) clear alerts before re-evaluating, (b) deduplicate by thresholdId, or (c) only trigger alerts for _new_ breaches not already in the alerts array.
- [usePortfolio.ts:L131-L145](app/hooks/usePortfolio.ts#L131): `refetch` uses `fetch()` without an `AbortController`. If the component unmounts during a fetch, the response handler still runs (guarded by `mountedRef`, but the fetch itself cannot be cancelled). **Fix**: Add `AbortController` similar to `useOptionsChain.ts`.
- [PositionsTable.tsx:L82-L87](app/components/portfolio/PositionsTable.tsx#L82): Sortable `<th>` elements use `onClick` but are not focusable or keyboard-accessible. Same issue as `OptionsChainTable.tsx`. **Fix**: Add `tabIndex={0}`, `role="columnheader"`, `aria-sort`, and `onKeyDown`.
- [PortfolioRiskSection.tsx:L65-L74](app/components/portfolio/PortfolioRiskSection.tsx#L65): Tab navigation div lacks `role="tablist"`, and tab buttons lack `role="tab"`, `aria-selected`, and `aria-controls` pointing to the tab panel. **Fix**: Add proper ARIA tab semantics.
- [RiskAlertBanner.tsx:L26-L34](app/components/portfolio/RiskAlertBanner.tsx#L26): Individual alert banners don't have `role="alert"`. Only the overall container header has the warning icon. **Fix**: Add `role="alert"` and `aria-live="assertive"` for critical alerts, `aria-live="polite"` for warnings.
- [RiskThresholdConfig.tsx:L17](app/components/portfolio/RiskThresholdConfig.tsx#L17): `uid()` is copy-pasted again. See Issue #3 WARN about extracting to shared utility.
- [riskCalculations.ts:L22-L27](app/utils/riskCalculations.ts#L22): Greeks computation uses `leg.premium` as a proxy multiplier. This gives directionally correct but quantitatively misleading Greek exposure values. Should be documented in the UI (e.g., "Estimated Greeks — connect API for precise values"). **Fix**: Add a visible disclaimer in `PortfolioSummaryCards` or `StrategyGroupView`.

### FAIL Items (must fix before release)

- [usePortfolio.ts:L119-L128](app/hooks/usePortfolio.ts#L119): Alert accumulation bug — every time `positions` or `thresholds` change, `evaluateThresholds` dispatches new alerts that are _added_ to the existing array. This means alerts grow unboundedly with each state change. A simple page interaction that triggers a re-render with positions can produce hundreds of duplicate alerts in minutes. **Fix**: Either dispatch a `CLEAR_ALERTS` before re-evaluating, or replace the `TRIGGER_ALERT` dispatches with a single `SET_ALERTS` action that replaces all alerts at once. Example fix in the effect:
  ```typescript
  const alerts = evaluateThresholds(summary, state.thresholds);
  dispatch({ type: 'CLEAR_ALERTS' });
  for (const alert of alerts) {
    dispatch({ type: 'TRIGGER_ALERT', payload: alert });
  }
  ```
  Or better, add a `SET_ALERTS` action:
  ```typescript
  dispatch({ type: 'SET_ALERTS', payload: alerts });
  ```

**Verdict: APPROVED WITH CONDITIONS**  
Must fix the FAIL item (alert accumulation bug). WARN items should be filed as follow-up issues.

---

## page.tsx — Integration Review

### PASS Items

- **Section ordering**: Yahoo → Strategy → Portfolio → Providers — logical top-to-bottom flow from data source to analysis to risk management to settings.
- **Import correctness**: All four new section components are imported and rendered.
- **No prop drilling**: Each section is self-contained with its own context provider.

### WARN Items (should fix but not blocking)

- [page.tsx:L17](app/page.tsx#L17): The `log` function parameter `data` is typed as `any`. Several state variables (`opportunities`, `portfolio`, `trackedTrades`, `multiLegOpportunities`, `debugLogs`) use `any[]` or `any`. These are pre-existing Issues #1/#2 code, but they violate the project's `strict: true` tsconfig and TypeScript instructions. **Fix**: Type these properly in a follow-up Story.
- [page.tsx:L59](app/page.tsx#L59): `error: any` catch clauses appear multiple times. Should use `error: unknown` with `instanceof Error` guard (already done in the new Issue #3-6 code, but the existing page.tsx code is inconsistent). **Fix**: Migrate to `catch (error: unknown)` pattern — follow-up PR.
- [page.tsx:L381-L401](app/page.tsx#L381): `onKeyPress` is deprecated in React 18. Should use `onKeyDown`. **Fix**: Replace `onKeyPress` with `onKeyDown` and check `e.key === 'Enter'`.
- [page.tsx:L329](app/page.tsx#L329): `prompt()` is used for user input (quantity, exit price). This is not accessible (no screen reader support, no custom styling) and blocks the main thread. **Fix**: Replace with a modal component in a follow-up PR.
- [page.tsx:L150](app/page.tsx#L150): `useEffect` with empty deps includes calls to `fetchScanData`, `fetchPortfolioData`, `fetchMultiLegData` which are not stable references (not wrapped in `useCallback`). React StrictMode may cause double-invocation. ESLint `exhaustive-deps` would flag this. **Fix**: Wrap fetch functions in `useCallback` or use refs.

### FAIL Items (must fix before release)

- None specific to Issue #3-6 integration. The new sections are cleanly integrated.

**Note**: page.tsx WARN items are pre-existing technical debt, not introduced by Issues #3-6.

---

## Cross-Cutting Observations

| Finding | Severity | Files Affected |
|---------|----------|----------------|
| `uid()` function duplicated 4× | WARN | `strategyTemplates.ts`, `LegEditor.tsx`, `StrategyBuilderSection.tsx`, `RiskThresholdConfig.tsx` |
| `DEFAULT_API_BASE` hardcoded 3× | WARN | `providerFactory.ts`, `useOptionsChain.ts`, `usePortfolio.ts` |
| Sortable `<th>` elements lack keyboard access | WARN | `OptionsChainTable.tsx`, `PositionsTable.tsx` |
| Modal lacks focus trap + ARIA dialog role | WARN | `ProviderFormModal.tsx` |
| No unit tests shipped | INFO | All files — test coverage is 0% for Issues #3-6 code |

---

## Summary

| Issue | Verdict | PASS | WARN | FAIL |
|-------|---------|------|------|------|
| **#5 — Yahoo Finance** | APPROVED WITH CONDITIONS | 11 | 7 | 2 |
| **#4 — Data Provider** | APPROVED WITH CONDITIONS | 10 | 7 | 1 |
| **#3 — Strategy Builder** | APPROVED | 13 | 7 | 0 |
| **#6 — Portfolio Risk** | APPROVED WITH CONDITIONS | 12 | 8 | 1 |
| **page.tsx Integration** | APPROVED | 3 | 5 | 0 |

### Mandatory Fixes Before Release (4 total)

1. **Issue #5**: Add `safeNumber` helper to prevent NaN propagation in `mapContract` ([useOptionsChain.ts:L57](app/hooks/useOptionsChain.ts#L57))
2. **Issue #5**: Add `Array.isArray` guard on `json.contracts` in `mapChain` ([useOptionsChain.ts:L55](app/hooks/useOptionsChain.ts#L55))
3. **Issue #4**: Don't persist API keys in plaintext to localStorage ([ProviderFormModal.tsx:L88](app/components/providers/ProviderFormModal.tsx#L88))
4. **Issue #6**: Fix alert accumulation bug — clear or deduplicate before re-evaluating thresholds ([usePortfolio.ts:L119](app/hooks/usePortfolio.ts#L119))

### Recommended Follow-Up Issues

1. Extract `uid()` to `app/utils/uid.ts` (5 min)
2. Extract `DEFAULT_API_BASE` to `app/utils/constants.ts` (5 min)
3. Add ARIA semantics to sortable table headers, modal, tabs, and progress bars (1-2 hr)
4. Add focus trap to `ProviderFormModal` (30 min)
5. Fix threshold/provider duplication on localStorage load (30 min)
6. Add unit tests for `blackScholes.ts`, `riskCalculations.ts`, `circuitBreaker.ts` (2 hr)
7. Clean up `page.tsx` `any` types and deprecated `onKeyPress` (1 hr)
