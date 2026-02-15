# ADR-2: Advanced Filtering & Screening Architecture

**Status**: Accepted  
**Date**: 2026-02-14  
**Author**: Solution Architect Agent  
**Epic**: #1  
**Issue**: #2  
**PRD**: [PRD-options-scanner-v2.md](../prd/PRD-options-scanner-v2.md)  
**UX**: [UX-2.md](../ux/UX-2.md)

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

The Options Scanner frontend is currently a monolithic 531-line React component (`app/page.tsx`) with no filtering capability. Users see a flat list of scan results with no ability to narrow by IV percentile, Greeks, DTE, or volume/OI ratio. The PRD requires an advanced filtering system that supports range sliders, preset management (save/load up to 5 configurations), real-time result counts, and sub-2-second response times for 500+ tickers.

The UX design specifies 6 filter groups (IV percentile, DTE, Volume/OI, Delta, Theta, Vega), plus option type and moneyness dropdowns, with a responsive layout (table on desktop, cards on mobile) and educational tooltips for beginner traders.

**Requirements:**
- Multi-parameter filtering: IV Percentile (0-100), Volume/OI (0.5-10x), Delta (±0.05-1.0), DTE (0-365), Theta, Vega ranges
- Save/load up to 5 filter presets with one-click activation
- Real-time result count badge updating as filters change
- Response time <2 seconds (P90) for 500+ tickers
- WCAG 2.1 AA compliant (keyboard navigation, 4.5:1 contrast, screen reader announcements)
- Responsive: table layout (desktop), card layout (mobile <768px)

**Constraints:**
- Must integrate with existing FastAPI backend `/api/scan` endpoint
- No UI component library currently used — all custom components with inline styles
- Frontend deployed on Azure App Service (Node.js 20.x), Next.js 14.2.5
- Backend uses Yahoo Finance free tier (15-20 min delayed data, ~2,000 req/hr rate limit)
- 1-2 full-stack engineers, 3-week timeline for Phase 2 (Weeks 5-7 per PRD)

**Background:**
The existing `page.tsx` manages 11 useState hooks, fetches from `/api/scan`, `/api/portfolio`, `/api/watchlist`, and `/api/multi-leg-opportunities` endpoints. There is no component decomposition, no shared state management, and all styling is inline. The filtering feature is the first major UI enhancement and will establish architectural patterns for subsequent features (Strategy Builder #3, Portfolio Risk #6).

---

## Decision

We will decompose the monolithic `page.tsx` into a component-based architecture using React Context + `useReducer` for filter state management, with debounced server-side filtering via query parameters on the existing `/api/scan` endpoint, and localStorage-based preset storage for MVP.

**Key architectural choices:**

1. **Component decomposition**: Extract `page.tsx` into discrete components under `app/components/scanner/` — FilterPanel, PresetsBar, ResultsTable, ResultsCards, RangeSlider, FilterChip, and supporting primitives
2. **State management**: React Context (`FilterContext`) with `useReducer` for filter state — co-located with the scanner feature, avoids external dependency
3. **API integration**: Debounced (200ms) query-parameter-based filtering on `/api/scan` — filter params serialized to URL search params for shareability
4. **Preset storage**: localStorage for MVP (max 5 presets) — backend sync deferred to Phase 4 per UX open questions
5. **Responsive strategy**: CSS media queries with dual render paths — `<ResultsTable>` for desktop (≥1024px), `<ResultsCards>` for mobile (<768px)
6. **Performance**: `react-window` for virtualized scrolling (>100 results), `requestAnimationFrame` for slider rendering, client-side caching by filter hash (60s TTL)

---

## Options Considered

### Option 1: React Context + useReducer (Feature-Scoped State)

**Description:**
Create a `FilterContext` provider wrapping the scanner section. Filter state managed via `useReducer` with typed actions (SET_FILTER, RESET_FILTER, LOAD_PRESET, SAVE_PRESET). Components consume state via `useFilter()` custom hook.

**Pros:**
- Zero external dependencies — uses built-in React APIs
- Co-located with feature — easy to reason about, no global state pollution
- TypeScript-friendly — full type safety on actions and state
- Familiar pattern for React developers
- Sufficient for current complexity (single feature with <10 state fields)

**Cons:**
- Re-renders propagate to all consumers on any state change (mitigated with `useMemo`/`React.memo`)
- No built-in devtools (unlike Redux/Zustand)
- May need migration if cross-feature state sharing becomes necessary

**Effort**: S  
**Risk**: Low

---

### Option 2: Zustand (Lightweight Global Store)

**Description:**
Use Zustand — a minimal global state library (~1KB) — with a `useFilterStore` hook. Provides selector-based subscriptions to minimize re-renders.

**Pros:**
- Selector-based subscriptions — granular re-render control
- Built-in devtools middleware
- Easily shareable across features (Strategy Builder can read filter state)
- Minimal boilerplate — simpler than Redux

**Cons:**
- Adds an external dependency (even if small)
- Global state pattern may be premature for a single feature
- Team must learn new API (though simple)

**Effort**: S  
**Risk**: Low

---

### Option 3: URL Search Params Only (No Client State)

**Description:**
Store all filter state exclusively in URL search parameters. Use `useSearchParams()` from Next.js. Components read/write URL params directly.

**Pros:**
- Shareable URLs for free — copy-paste filter configurations
- Browser back/forward navigation restores filter state
- No state management code beyond URL serialization

**Cons:**
- URL length limits (~2,048 chars) could be hit with many filter ranges
- Every filter change triggers URL update → potential history pollution
- Complex to manage multi-value ranges (min/max pairs) in URL format
- No good mechanism for preset management in URL alone

**Effort**: M  
**Risk**: Medium

---

## Rationale

We chose **Option 1 (React Context + useReducer)** because:

1. **Right-sized for scope**: The filtering feature has ~10 state fields within a single page section. Context + useReducer handles this cleanly without external dependencies. Zustand's selector pattern is premature optimization — the filter panel has at most 12 components consuming state.

2. **Zero dependency footprint**: The project currently has no state management library. Adding one for a single feature creates a pattern tax on future contributors. Built-in React APIs keep the learning curve flat.

3. **Composability with URL sync**: We will add optional URL synchronization as a side effect in the reducer (via `useEffect`), giving us shareable URLs without making URL the primary state holder. This avoids the URL-length and history-pollution issues of Option 3.

4. **Migration path**: If cross-feature state sharing becomes necessary (e.g., Strategy Builder reading active filters), migrating from Context to Zustand is mechanical — lift the state and change the hook import. The TypeScript interfaces remain identical.

**Key decision factors:**
- Team size (1-2 engineers) favors simplicity over infrastructure
- Single-feature scope doesn't justify global state
- URL sync as a side effect gives shareability without the downsides

---

## Consequences

### Positive
- No new dependencies added to `package.json`
- Clear component boundaries established — reusable for future features
- TypeScript interfaces (`FilterState`, `Preset`) become shared contracts between frontend and API
- Debounced API calls reduce backend load vs. per-keystroke requests
- Virtualized scrolling handles large result sets (500+ rows) without DOM bloat

### Negative
- Context re-renders require careful `React.memo` / `useMemo` usage to avoid performance regression in the results table
- localStorage presets are device-specific — users lose presets on new browser/device (acceptable for MVP)
- Monolith decomposition is a refactoring task with no user-visible change — must be scoped carefully

### Neutral
- Establishes component architecture pattern that subsequent features (#3, #6) will follow
- Introduces `app/components/` directory structure convention
- Debounce timing (200ms) may need tuning based on real-world API latency

---

## Implementation

**Detailed technical specification**: [SPEC-2.md](../specs/SPEC-2.md)

**High-level implementation plan:**

1. **Scaffold component structure** — Create `app/components/scanner/` directory with FilterPanel, PresetsBar, ResultsTable, ResultsCards, and primitive components (RangeSlider, FilterChip, PresetChip, InfoTooltip, ResultCountBadge)
2. **Implement FilterContext** — Type-safe context provider with useReducer, FilterState interface, and action types
3. **Build filter primitives** — RangeSlider (dual-handle, `requestAnimationFrame`-driven), FilterChip (selectable/dismissible), PresetChip (active state, context menu)
4. **Compose FilterPanel** — Assemble filter groups with labeled sections, educational tooltips, and result count badge
5. **Implement ResultsTable/ResultsCards** — Desktop table with sortable columns and expandable rows; mobile card layout with touch-optimized actions
6. **API integration layer** — Debounced fetch hook (`useScanFilters`) that serializes FilterState to query params, caches by hash, and manages loading/error states
7. **Preset management** — localStorage CRUD with 5-preset cap, PresetsBar UI with save modal
8. **Refactor page.tsx** — Replace monolith scanner section with composed components; preserve existing portfolio, watchlist, and multi-leg sections unchanged
9. **Accessibility pass** — ARIA attributes, keyboard navigation, screen reader announcements per UX spec Section 8
10. **URL sync** — Optional: serialize active filters to URL search params for shareability

**Key milestones:**
- Phase 2a (Week 5): Component scaffold + FilterContext + RangeSlider primitive
- Phase 2b (Week 6): FilterPanel assembly + ResultsTable + API integration
- Phase 2c (Week 7): Presets + responsive layout + accessibility + polish

---

## References

### Internal
- [PRD-options-scanner-v2.md](../prd/PRD-options-scanner-v2.md) — Feature 1 requirements, non-functional requirements
- [UX-2.md](../ux/UX-2.md) — Component specifications, wireframes, accessibility requirements
- [filter-panel.html prototype](../ux/prototypes/filter-panel.html) — Interactive reference implementation

### External
- [React useReducer documentation](https://react.dev/reference/react/useReducer)
- [react-window for virtualized lists](https://react-window.vercel.app/)
- [WCAG 2.1 AA Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)

---

## Review History

| Date | Reviewer | Status | Notes |
|------|----------|--------|-------|
| 2026-02-14 | Solution Architect Agent | Accepted | Initial architecture decision |

---

**Author**: Solution Architect Agent  
**Last Updated**: 2026-02-14
