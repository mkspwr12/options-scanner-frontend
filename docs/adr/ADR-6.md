# ADR-6: Enhanced Portfolio Risk Management Architecture

**Status**: Accepted  
**Date**: 2026-02-15  
**Author**: Solution Architect Agent  
**Epic**: #1  
**Issue**: #6  
**PRD**: [PRD-options-scanner-v2.md](../prd/PRD-options-scanner-v2.md)  
**UX**: [UX-6.md](../ux/UX-6.md)

---

## Table of Contents

1. [Context](#context)
2. [Decision](#decision)
3. [Options Considered](#options-considered)
4. [Rationale](#rationale)
5. [Consequences](#consequences)
6. [Implementation](#implementation)
7. [References](#references)
8. [Review History](#review-history)

---

## Context

The Options Scanner frontend currently displays a flat list of portfolio positions (see `app/page.tsx` lines 448-477) with per-position P&L cards but no aggregated Greek exposure, no risk alerting, and no strategy attribution. Traders must mentally sum Greeks across positions and use external spreadsheets to monitor portfolio-level risk — a process that is slow, error-prone, and defeats the purpose of a real-time scanner.

The UX design (UX-6.md) specifies a portfolio dashboard with: Greek summary cards (delta, gamma, theta, vega) with risk-level indicators, a P&L summary panel (total, today, winners/losers), a sortable positions table with strategy tags and expandable rows, strategy filter chips with win-rate badges, a risk alert banner with threshold configuration modal, a risk heatmap for multi-dimensional exposure, and a mobile-first card layout for on-the-go monitoring.

**Requirements (from PRD US-4.1 through US-4.4):**
- Display total portfolio delta, gamma, theta, vega aggregated across all positions
- Color-code risk levels: green (low), amber (medium), red (high) with configurable thresholds
- Alert when total portfolio delta exceeds ±2.0 (customizable)
- Show entry price, current price, unrealized P&L ($ and %) per position
- Sort by P&L descending; display total portfolio P&L summary
- Tag positions by strategy type (Iron Condor, Vertical Spread, Straddle, Naked)
- Filter portfolio view by strategy tag; display win rate per strategy
- Mobile-responsive layout with simplified Greeks view (delta/theta only)
- Quick close position button on mobile cards

**Constraints:**
- Must integrate with existing `FilterContext` (Issue #2) and `DataContext` (Issue #5) providers
- Backend provides `/api/portfolio` endpoint returning positions with current prices and Greeks
- No external state management libraries — React Context + `useReducer` pattern (established in #2)
- No external charting libraries — SVG-based custom components, consistent with app approach
- Frontend deployed on Azure App Service (Node.js 20.x), Next.js 14.2.5, React 18.3.1, TypeScript 5.5.4
- Performance target: <100ms Greek aggregation for 50 positions
- 1-2 engineers, Phase 4 timeline (Weeks 12-14 per PRD)

**Background:**
Issue #2 established `FilterContext` with `useReducer`, `Map` caching, and zero-dependency hooks. Issue #5 extended with `DataContext` for connection health, circuit breaker, and rate limit tracking. This ADR adds a third context provider — `PortfolioContext` — for portfolio state, Greek aggregation, risk alerts, and strategy attribution. All three contexts follow the same `useReducer` + TypeScript interfaces + custom hooks pattern.

---

## Decision

We will implement a `PortfolioContext` provider using React Context + `useReducer` (separate from `ScannerContext` and `DataContext`), with client-side Greek aggregation via `useMemo`, client-side risk alert threshold checking persisted to `localStorage`, client-side strategy auto-detection from position legs, and a dashboard layout with summary cards + detail table in a responsive CSS Grid.

**Key architectural choices:**

1. **Portfolio state management** — `PortfolioContext` with `useReducer`. A dedicated context keeps portfolio concerns isolated from scanner filters (#2) and real-time data (#5). The reducer manages positions, strategy groups, alert configs, and aggregated Greek snapshots. This follows the established multi-context nesting pattern.

2. **Greek aggregation** — Client-side summation from individual positions using `useMemo` for performance. Each position carries its own Greeks (delta, gamma, theta, vega) from the `/api/portfolio` response. Portfolio-level Greeks are the sum of per-position Greeks weighted by contract multiplier and quantity. `useMemo` ensures recalculation only when positions change, targeting <100ms for 50 positions.

3. **Risk alert system** — Client-side threshold checking with `localStorage` persistence for alert configurations. Thresholds (e.g., delta ±2.0, theta -$100/day, position loss -50%) are stored in `localStorage` as JSON. On each Greek aggregation, thresholds are evaluated and active alerts are dispatched to the reducer. No server-side alert storage needed for MVP — alerts are evaluated in-browser on each data refresh.

4. **Strategy attribution** — Client-side tagging with a `StrategyType` enum and auto-detection of common patterns from position legs. Detection algorithm: 4 legs same expiry with 2 calls + 2 puts = Iron Condor; 2 legs same type, same expiry, different strikes = Vertical Spread; 2 legs same strike, same expiry, different types = Straddle; etc. Manual override via dropdown. Strategy tags persist with position data.

5. **P&L calculation** — Client-side from position entry price vs. current price (from `/api/portfolio`). Unrealized P&L = (currentPrice - entryPrice) × quantity × contractMultiplier. Percentage P&L = unrealizedPnl / (entryPrice × quantity × contractMultiplier) × 100. Total portfolio P&L is the sum of all position P&Ls. Today's P&L derived from `previousClose` field when available.

6. **Layout pattern** — Dashboard with summary cards (Greek summary bar) + detail table (positions), arranged in a responsive CSS Grid. Desktop: 4-column grid for Greek cards, full-width table below. Tablet: 2-column grid. Mobile: stacked cards replacing table rows. Consistent with existing `scanner.module.css` approach.

7. **Chart library** — SVG-based custom components for P&L sparklines and risk heatmap. No external charting library (Recharts, D3, etc.) to maintain zero-dependency consistency. `PnlSparkline` renders a simple SVG polyline from recent P&L snapshots. `RiskHeatmap` renders an SVG grid with color-mapped cells. Both are <200 lines each.

---

## Options Considered

### Option 1: Dedicated PortfolioContext with useReducer (Chosen)

**Description:**
Separate React Context provider specifically for portfolio state. `useReducer` manages positions array, strategy groups, risk alert configs, and aggregated Greek cache. Exposed via `usePortfolio()` hook.

**Pros:**
- Clean separation of concerns — portfolio, scanner, and data contexts are independent
- Reducer actions are explicit and testable (ADD_POSITION, REMOVE_POSITION, SET_ALERTS, etc.)
- Context consumers only re-render for portfolio changes, not scanner filter updates
- Consistent with Issue #2 and #5 architectural pattern

**Cons:**
- Third context provider increases nesting depth (`FilterContext > DataContext > PortfolioContext`)
- Some shared data (ticker symbols, current prices) may need to flow between contexts

**Effort**: M  
**Risk**: Low

---

### Option 2: Extend Existing FilterContext with Portfolio State

**Description:**
Add portfolio-related state (positions, alerts, Greeks) to the existing `FilterContextState` interface and `filterReducer`.

**Pros:**
- No additional context provider — less component nesting
- Shared ticker data available without prop drilling

**Cons:**
- Violates single responsibility — filter context becomes a god object
- Every portfolio change triggers re-renders in all scanner filter consumers
- Reducer grows unwieldy with 20+ action types
- Harder to test portfolio logic in isolation

**Effort**: S  
**Risk**: High (architecture degradation)

---

### Option 3: Zustand or Jotai for Portfolio State

**Description:**
Introduce a lightweight state management library (Zustand ~1KB, Jotai ~2KB) for portfolio state with atomic updates and selective subscriptions.

**Pros:**
- Atomic subscriptions — components only re-render for specific state slices
- No context nesting — store is global
- Less boilerplate than useReducer
- DevTools integration

**Cons:**
- Introduces external dependency — breaks zero-dependency pattern from #2 and #5
- Team must learn new API and patterns
- Two competing state management approaches in the same codebase
- Zustand patterns differ from established useReducer conventions

**Effort**: M  
**Risk**: Medium (pattern inconsistency)

---

### Option 4: Server-Side Greek Aggregation

**Description:**
Backend computes aggregated Greeks, P&L, and risk alerts. Frontend receives pre-computed summaries from a `/api/portfolio/summary` endpoint.

**Pros:**
- Computation offloaded to server — less client-side work
- Consistent calculations across devices
- Server can trigger push notifications for risk alerts

**Cons:**
- Adds backend scope to a frontend-focused issue
- Additional API roundtrip for every filter/sort change
- Stale aggregations between polls — dashboard shows outdated Greeks until next refresh
- Client-side aggregation of 50 positions is trivial (<10ms), making server-side overkill

**Effort**: L (requires backend changes)  
**Risk**: Medium

---

## Rationale

We chose **Option 1 (Dedicated PortfolioContext)** because:

1. **Pattern consistency**: Issues #2 and #5 established separate context providers (`FilterContext`, `DataContext`) with `useReducer`. Adding `PortfolioContext` follows the exact same pattern — predictable for engineers, zero learning curve.

2. **Render isolation**: Portfolio state changes (adding/removing positions, changing alert thresholds) should not trigger re-renders in scanner filter components. Separate contexts ensure selective re-rendering. With 50 positions updating every 60s, this matters for performance.

3. **Testability**: A standalone `portfolioReducer` function can be unit-tested with pure action/state assertions — no component rendering required. Strategy auto-detection, Greek aggregation, and threshold checking are pure functions that compose cleanly.

4. **Client-side aggregation is sufficient**: Summing Greeks across 50 positions is O(n) with n=50 — trivially fast. `useMemo` ensures it runs only when positions change. Server-side aggregation adds complexity (backend changes, API latency) for negligible computational benefit.

5. **localStorage for alerts is adequate for MVP**: Risk alert thresholds are user preferences, not shared state. `localStorage` avoids backend schema changes and is instantly available on page load. Migration to server-side storage is straightforward when multi-device sync is needed.

6. **Zero dependencies maintained**: Custom SVG components for sparklines and heatmap keep the dependency footprint at zero — consistent with #2 and #5. A full charting library (Recharts ≈40KB, D3 ≈20KB) would be overkill for a polyline and a color grid.

---

## Consequences

### Positive
- Third context provider follows established pattern — no new concepts for engineers
- `useMemo`-based Greek aggregation is <10ms for 50 positions — well under 100ms target
- `localStorage` for alert configs enables instant page-load behavior — no API call needed
- Strategy auto-detection eliminates manual tagging for common patterns (IC, VS, ST, STR)
- SVG-based sparklines and heatmap are lightweight (<5KB total), tree-shakeable, SSR-compatible
- Clean file structure mirrors #2 and #5 organization — contexts, hooks, components, types, utils

### Negative
- Three nested context providers (`FilterContext > DataContext > PortfolioContext`) add JSX nesting depth — mitigated by a `Providers` wrapper component
- `localStorage` alert configs are device-specific — not synced across browser tabs or devices (acceptable for MVP; future: backend sync)
- Strategy auto-detection has edge cases (custom multi-leg strategies, ratio spreads) — requires manual tagging fallback
- Client-side P&L calculation depends on accurate `entryPrice` from user input — garbage in, garbage out

### Neutral
- Establishes portfolio data pattern for future features (backtesting #7, heatmaps #8)
- `PortfolioContext` can consume `DataContext` connection status to show stale portfolio warnings
- Greek aggregation formula is simple summation — does not account for correlation or scenario analysis (out of scope)

---

## Implementation

**Detailed technical specification**: [SPEC-6.md](../specs/SPEC-6.md)

**High-level implementation plan:**

1. **TypeScript interfaces** — Define `Position`, `StrategyGroup`, `GreekSummary`, `RiskAlert`, `RiskThreshold`, `PortfolioState`, `PortfolioAction` in `app/types/scanner.ts` (extend existing file)
2. **PortfolioContext provider** — `app/components/scanner/PortfolioContext.tsx` with `useReducer` managing positions, strategies, alerts, and aggregated Greeks
3. **usePortfolioRisk hook** — `app/hooks/usePortfolioRisk.ts` fetching positions from `/api/portfolio`, computing aggregated Greeks via `useMemo`, and checking risk thresholds
4. **useRiskAlerts hook** — `app/hooks/useRiskAlerts.ts` with CRUD for alert configurations, threshold evaluation, and `localStorage` persistence
5. **Strategy auto-detection** — `app/utils/strategyDetector.ts` analyzing position legs to assign `StrategyType` enum values
6. **Greek aggregation utility** — `app/utils/greekAggregator.ts` summing per-position Greeks with contract multiplier and quantity weighting
7. **UI components:**
   - `PortfolioSummaryCards` — 4-card Greek summary bar with risk indicators
   - `PositionsTable` — sortable, expandable rows with strategy tags and P&L
   - `StrategyGroupView` — strategy filter chips with win-rate badges
   - `RiskAlertConfig` — modal for threshold configuration
   - `RiskHeatmap` — SVG grid visualization of multi-dimensional risk
   - `PnlSparkline` — SVG polyline for recent P&L trend
8. **Integration** — Wire `PortfolioContext` into `app/page.tsx` alongside `FilterContext` and `DataContext`
9. **Mobile layout** — Card-based responsive layout via CSS Grid with media queries
10. **Accessibility** — ARIA live regions for risk alerts, keyboard navigation for table, focus management for modal

**Key milestones:**
- Phase 4a (Week 12): TypeScript types + PortfolioContext + usePortfolioRisk + Greek aggregation
- Phase 4b (Week 13): PortfolioSummaryCards + PositionsTable + StrategyGroupView + strategy auto-detection
- Phase 4c (Week 14): RiskAlertConfig + RiskHeatmap + PnlSparkline + mobile layout + accessibility

---

## References

### Internal
- [PRD-options-scanner-v2.md](../prd/PRD-options-scanner-v2.md) — Feature 4 requirements (Enhanced Portfolio Risk Management), US-4.1 through US-4.4
- [UX-6.md](../ux/UX-6.md) — Component specifications, wireframes, user flows, accessibility requirements
- [ADR-2.md](./ADR-2.md) — Established React Context + useReducer + Map cache + zero-dependency pattern
- [ADR-5.md](./ADR-5.md) — DataContext provider, CircuitBreaker, connection status pattern
- [SPEC-2.md](../specs/SPEC-2.md) — FilterContext architecture, hook patterns, type conventions
- [SPEC-5.md](../specs/SPEC-5.md) — DataContext architecture, polling, circuit breaker integration
- [SPEC-6.md](../specs/SPEC-6.md) — Detailed technical specification for this ADR

### External
- [React useReducer documentation](https://react.dev/reference/react/useReducer)
- [React useMemo documentation](https://react.dev/reference/react/useMemo)
- [Web Storage API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Options Greeks Overview (Investopedia)](https://www.investopedia.com/trading/using-the-greeks-to-understand-options/)
- [CSS Grid Layout (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout)

---

## Review History

| Date | Reviewer | Status | Notes |
|------|----------|--------|-------|
| 2026-02-15 | Solution Architect Agent | Accepted | Initial architecture decision |

---

**Author**: Solution Architect Agent  
**Last Updated**: 2026-02-15
