# ADR-3: Multi-Leg Strategy Builder Architecture

**Status**: Accepted  
**Date**: 2026-02-15  
**Author**: Solution Architect Agent  
**Epic**: #1  
**Issue**: #3  
**PRD**: [PRD-options-scanner-v2.md](../prd/PRD-options-scanner-v2.md)  
**UX**: [UX-3.md](../ux/UX-3.md)

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

The Options Scanner frontend currently displays multi-leg opportunities as a flat card grid fetched from `/api/multi-leg-opportunities`. Users cannot construct, customize, or visualize strategies — they can only view pre-computed suggestions. The PRD requires a guided Strategy Builder that lets traders construct 2-4 leg strategies (vertical spreads, iron condors, straddles/strangles, butterflies, calendar spreads), visualize P&L at expiration in real time, and track built strategies in their portfolio.

The UX design (UX-3.md) specifies a **wizard-style** builder with 3 steps: (1) select strategy template, (2) select underlying + expiration, (3) configure legs with live P&L chart. The builder uses a 2-column desktop layout (leg editor left, payoff chart right) and a stacked mobile layout. Five strategy templates provide sensible default leg configurations; a "Custom" mode allows free-form leg construction.

**Requirements:**
- Template-first strategy construction: 5 templates (Vertical Spread, Iron Condor, Straddle/Strangle, Butterfly, Calendar Spread) + Custom mode
- Real-time P&L chart: updates within 200ms of any leg change (strike, type, quantity)
- Client-side Black-Scholes for instant Greeks + premium estimation
- Strategy metrics always visible: max profit, max loss, breakeven(s), risk/reward ratio, probability of profit
- Validation: prevent invalid leg combinations (e.g., mismatched expirations in iron condor)
- Integration with existing `/api/multi-leg-opportunities` for strategy suggestions
- Integration with portfolio tracking (POST to `/api/portfolio`)
- WCAG 2.1 AA: keyboard navigation through legs, screen reader announcements for P&L changes

**Constraints:**
- Must follow the component architecture established by Issue #2 (FilterContext pattern, CSS Modules, hooks layer)
- Next.js 14.2.5, React 18, TypeScript 5.5, no UI library
- Yahoo Finance free tier: 15-20 min delayed data, ~2,000 req/hr rate limit
- P&L calculation must be client-side to avoid API round-trip latency
- 1-2 engineers, Phase 3 timeline (Weeks 8-10 per PRD)

**Background:**
Issue #2 established the following patterns that this feature must follow:
- React Context + `useReducer` for feature-scoped state management
- Custom hooks layer (`useScanFilters`, `usePresets`, `useDebounce`)
- CSS Modules for component styling
- Component directory structure under `app/components/`
- TypeScript interfaces in `app/types/`

---

## Decision

We will build a wizard-style Multi-Leg Strategy Builder using React Context + `useReducer` (consistent with #2's FilterContext pattern), client-side Black-Scholes calculations for instant P&L rendering, and Canvas API for the payoff chart.

**Key architectural choices:**

1. **Wizard pattern**: 3-step progressive disclosure (Template → Underlying → Legs/Chart) — reduces cognitive load for beginners while allowing power users to jump between steps. Steps are implemented as wizard "phases" within a single page component, not routed pages.

2. **State management**: `StrategyContext` with `useReducer` — mirrors FilterContext from #2. State holds strategy type, legs array (1-4), underlying info, and computed metrics. Computed values (max profit/loss, breakevens, payoff curve) are derived via `useMemo` from leg state, not stored in reducer.

3. **P&L calculation**: Client-side Black-Scholes implementation in a pure utility module (`app/utils/blackScholes.ts`). Recalculates on every leg change via `useMemo` with <100ms target. No server round-trip for price estimation — server is only used for fetching option chain data.

4. **Payoff chart**: Canvas API (`<canvas>` with 2D context) for the P&L visualization. Canvas outperforms SVG for real-time redrawing during slider interactions (target: <16ms per frame). Wrapped in a `PayoffChart` React component with `useRef` + `useEffect` for imperative drawing.

5. **Strategy templates**: 5 hardcoded template definitions in `app/utils/strategyTemplates.ts` — each template specifies default leg count, buy/sell directions, call/put types, and relative strike offsets. Templates are pure data objects; no server storage for MVP.

6. **Component hierarchy**: `StrategyWizard` (top-level) → `TemplateSelector` | `LegEditor` | `PayoffChart` | `BreakevenDisplay` | `StrategyMetrics`, all wrapped in `StrategyContext.Provider`.

---

## Options Considered

### Option 1: Wizard Pattern with React Context + useReducer (Chosen)

**Description:**
A stepped wizard UI (Template → Underlying → Configure Legs) with strategy state managed via `StrategyContext` + `useReducer`. P&L computed client-side. One page component with internal step state.

**Pros:**
- Consistent with #2's FilterContext pattern — same mental model for engineers
- Progressive disclosure matches UX spec — beginners follow guided flow
- useReducer handles complex state transitions (add/remove/update legs) cleanly
- No new dependencies beyond what #2 already established
- Wizard steps can be bookmarked/shared via URL params (`?step=3&template=vertical`)

**Cons:**
- Wizard step transitions add UI complexity (animation, validation gates)
- Context re-renders require `React.memo` on PayoffChart to avoid chart flicker
- Multi-step validation is more complex than single-page validation

**Effort**: M  
**Risk**: Low

---

### Option 2: Single-Page Builder with Zustand

**Description:**
All builder controls (template selector, leg editor, chart) on a single scrollable page. State managed via Zustand store with selectors for granular re-render control.

**Pros:**
- Everything visible at once — power users iterate faster
- Zustand selectors prevent PayoffChart re-renders on unrelated state changes
- Simpler navigation (no step management)

**Cons:**
- Information overload for beginners (6 templates + leg editor + chart + metrics all at once)
- Introduces Zustand dependency — inconsistent with #2's Context pattern
- Vertical scroll required on desktop to see chart while editing legs far down the page
- Contradicts UX-3.md wizard specification

**Effort**: M  
**Risk**: Medium (UX mismatch, dependency inconsistency)

---

### Option 3: Server-Side P&L Calculation

**Description:**
Legs sent to a backend endpoint (`POST /api/strategy/calculate`) that returns payoff curve, Greeks, and metrics. Frontend renders the result.

**Pros:**
- Centralized calculation logic — reusable for backtesting, alerts, portfolio risk
- More accurate pricing (server can use volatility surface, dividend adjustments)
- Simpler frontend — just render what the API returns

**Cons:**
- Round-trip latency (100-500ms) makes interactive chart updates feel laggy
- Adds backend dependency — Phase 3 scope creep if backend needs new endpoints
- Yahoo Finance rate limit (2,000/hr) constrains frequent recalculations
- Contradicts UX requirement of <200ms P&L update

**Effort**: L  
**Risk**: High (latency, backend scope, rate limits)

---

## Rationale

We chose **Option 1 (Wizard + Context + useReducer)** because:

1. **Consistency with #2**: The FilterContext established a proven pattern for feature-scoped state. Introducing a different pattern (Zustand) for an adjacent feature creates cognitive overhead. `StrategyContext` mirrors `FilterContext` — same `useReducer`, same dispatch pattern, same TypeScript action union type. Engineers who built #2 can build #3 without learning new tools.

2. **UX alignment**: The UX-3.md specification explicitly calls for a wizard flow with progressive disclosure. Implementing a single-page builder contradicts the validated UX design and the user research showing beginners need guided construction.

3. **Client-side P&L is essential**: The <200ms update requirement eliminates server-side calculation. Black-Scholes is well-understood, deterministic, and computationally trivial (~0.1ms per option). A pure TypeScript implementation with no dependencies keeps the bundle small and the interaction instant.

4. **Canvas over SVG for charting**: The payoff chart redraws on every leg parameter change. Canvas provides imperative draw calls that execute in <16ms (60fps), whereas SVG DOM manipulation at this frequency causes layout thrashing. SVG would be preferable for static charts, but the interactive nature of this chart demands Canvas.

5. **Hardcoded templates over server-stored**: 5 templates are a fixed, known set defined by options market convention. Storing them on the server adds infrastructure complexity with no benefit — they don't change, aren't user-specific, and don't need versioning. A `strategyTemplates.ts` file is simpler, faster, and testable.

---

## Consequences

### Positive
- Consistent architecture across #2 and #3 — same Context + useReducer + hooks + CSS Modules pattern
- Instant P&L feedback (<100ms) improves trader confidence in strategy construction
- No new runtime dependencies — Black-Scholes is a ~50-line pure function
- Canvas chart is memory-efficient vs. SVG DOM nodes for complex payoff curves
- Template system is easily extensible — adding a 6th template is a single object addition

### Negative
- Client-side Black-Scholes uses simplified assumptions (no dividends, European-style) — accuracy gap vs. real market pricing (acceptable for educational/preview use)
- Canvas chart loses SVG accessibility benefits (text selection, native zoom) — mitigated with ARIA labels and text overlay for key data points
- Wizard step management adds ~100 lines of step-transition logic and validation
- Context re-renders require `React.memo` on expensive components (PayoffChart, LegEditor)

### Neutral
- Establishes the "feature Context" pattern as the standard for all Issue #1 epic features
- Black-Scholes utility can be shared with future Portfolio Risk (#6) calculations
- Template definitions can later be loaded from server if user-defined templates are added (Phase 5+)

---

## Implementation

**Detailed technical specification**: [SPEC-3.md](../specs/SPEC-3.md)

**High-level implementation plan:**

1. **TypeScript interfaces** — Define `StrategyLeg`, `StrategyTemplate`, `StrategyState`, `PayoffPoint`, `StrategyAction` in `app/types/strategy.ts`
2. **Black-Scholes utility** — Implement `calcOptionPrice()`, `calcPayoffAtExpiry()`, `calcBreakevens()` in `app/utils/blackScholes.ts` — pure functions, fully unit tested
3. **Strategy templates** — Define 5 templates with default leg configurations in `app/utils/strategyTemplates.ts`
4. **StrategyContext** — `useReducer` with `strategyReducer`, provider component, `useStrategy()` hook in `app/components/strategy/StrategyContext.tsx`
5. **TemplateSelector** — Grid of 5 template cards + Custom option; dispatches `SELECT_TEMPLATE` action
6. **LegEditor** — Per-leg row with Buy/Sell, Call/Put, Strike, Expiration, Quantity controls; dispatches `UPDATE_LEG` action
7. **PayoffChart** — Canvas-based P&L chart with crosshair interaction, breakeven markers, current price indicator
8. **BreakevenDisplay** — Text display of breakeven price(s), max profit/loss, risk/reward ratio
9. **StrategyWizard** — Top-level component managing wizard step state, validation gates, step navigation
10. **Integration** — Connect to `/api/multi-leg-opportunities` for suggested strategies, portfolio tracking via POST

**Key milestones:**
- Phase 3a (Week 8): TypeScript interfaces + Black-Scholes + Templates + StrategyContext + TemplateSelector
- Phase 3b (Week 9): LegEditor + PayoffChart + BreakevenDisplay + wizard flow
- Phase 3c (Week 10): API integration + portfolio tracking + accessibility + mobile layout + polish

---

## References

### Internal
- [PRD-options-scanner-v2.md](../prd/PRD-options-scanner-v2.md) — Feature 2 requirements, user stories US-2.x
- [UX-3.md](../ux/UX-3.md) — Wireframes, user flows, component specs, accessibility requirements
- [ADR-2.md](ADR-2.md) — FilterContext architecture (pattern to follow)
- [SPEC-2.md](../specs/SPEC-2.md) — Implementation patterns established for #2

### External
- [Black-Scholes Model (Wikipedia)](https://en.wikipedia.org/wiki/Black%E2%80%93Scholes_model) — Pricing formula reference
- [Canvas API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) — 2D drawing context
- [React useReducer documentation](https://react.dev/reference/react/useReducer)
- [Options Strategy Payoff Diagrams (CBOE)](https://www.cboe.com/tradable_products/options/strategy_archive/)

---

## Review History

| Date | Reviewer | Status | Notes |
|------|----------|--------|-------|
| 2026-02-15 | Solution Architect Agent | Accepted | Initial architecture decision |

---

**Author**: Solution Architect Agent  
**Last Updated**: 2026-02-15
