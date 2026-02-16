# ADR-5: Real-Time Yahoo Finance Data Integration Architecture

**Status**: Accepted  
**Date**: 2026-02-15  
**Author**: Solution Architect Agent  
**Epic**: #1  
**Issue**: #5  
**PRD**: [PRD-options-scanner-v2.md](../prd/PRD-options-scanner-v2.md)  
**UX**: [UX-5.md](../ux/UX-5.md)

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

The Options Scanner frontend currently fetches market data from the FastAPI backend (`/api/scan`) via a single `useScanFilters` hook (Issue #2) but has no connection health awareness, no graceful degradation when Yahoo Finance is unavailable, and no per-contract Greeks display in an options chain format. The existing polling in `app/page.tsx` fires every 60 seconds with no error recovery — when the Yahoo Finance free tier rate-limits or returns errors, data silently stops updating and users have no way to know whether prices are current or stale.

The UX design (UX-5.md) specifies a 3-state connection badge (connected/degraded/offline), a data freshness bar with timestamp and countdown, a stale data warning banner, a rate limit indicator (N/2,000 requests this hour), and an options chain table with per-contract Greek columns (Δ, Γ, Θ, ν, IV) with color-coded tooltips.

**Requirements:**
- Configurable auto-refresh polling intervals: 30s, 60s (default), 120s
- Circuit breaker: 3-failure threshold opens the breaker, 5-minute cooldown, half-open test request
- Connection status: 3-state system (connected / degraded / offline) with visual indicators
- Data freshness: timestamp, countdown timer, stale data banner at 1-min / 5-min / 15-min thresholds
- Rate limit tracking: display usage (e.g., "1,247 / 2,000 requests this hour"), auto-throttle when approaching limit
- Options chain table: per-contract Greeks with moneyness-based color coding and educational tooltips
- Data normalization: snake_case API response → camelCase TypeScript interfaces

**Constraints:**
- Must integrate with existing `useScanFilters` hook and `FilterContext` from Issue #2
- Yahoo Finance free tier: 15-20 min delayed data, ~2,000 requests per hour
- No WebSocket support on the FastAPI backend — HTTP polling only
- Frontend deployed on Azure App Service (Node.js 20.x), Next.js 14.2.5
- No external state management libraries — React Context + `useReducer` pattern established in #2
- 1-2 engineers, Phase 3 timeline (Weeks 8-10 per PRD)

**Background:**
The Issue #2 implementation established in-memory `Map` caching with TTL (60s), debounced API calls, and snake_case→camelCase normalization in `useScanFilters.ts`. This ADR extends that foundation with real-time data concerns: connection health monitoring, circuit breaker protection, rate limit awareness, and per-ticker options chain data fetching via a new `/api/options-chain/{ticker}` endpoint.

---

## Decision

We will implement client-side polling with configurable intervals, a client-side `CircuitBreaker` class with a 3-state machine, in-memory `Map` cache with TTL for options chain data, and a `DataContext` provider (React Context + `useReducer`) to manage connection status, data freshness, and rate limit state — all consistent with the patterns established in Issue #2.

**Key architectural choices:**

1. **Data fetching strategy**: Client-side polling via `setInterval` in `useOptionsChain` hook with configurable intervals (30s/60s/120s). No SSE or WebSocket — the backend does not support them, and polling is sufficient for 15-20 min delayed Yahoo data.
2. **Circuit breaker**: Client-side `CircuitBreaker` class with closed/open/half-open states. Threshold: 3 consecutive failures → open. Cooldown: 5 minutes. Half-open: single test request. Resets to closed on success.
3. **Cache strategy**: In-memory `Map<string, { data: OptionsChain; timestamp: number }>` with 60s TTL, consistent with `useScanFilters`' `filterCache`. Cache key: `${ticker}:${expiration}`. No React Query or SWR — keeps dependency footprint at zero.
4. **Rate limit tracking**: Parse `X-RateLimit-Remaining` and `X-RateLimit-Reset` response headers from the backend + maintain a local request counter. Auto-throttle (extend interval to 120s) when >80% of limit consumed; pause polling when limit reached.
5. **Connection status state machine**: 3-state derived from API response patterns — `connected` (last request succeeded), `degraded` (1-2 consecutive failures), `offline` (circuit breaker open, ≥3 failures). Exposed via `useConnectionStatus` hook.
6. **Data normalization**: Normalize in `useOptionsChain` hook's `mapOptionsChain` function — snake_case→camelCase mapping with nested Greeks object flattening. Consistent with `useScanFilters.ts` `mapResult()` pattern.

---

## Options Considered

### Option 1: Client-Side Polling with Configurable Interval (Chosen)

**Description:**
`useOptionsChain` hook manages a `setInterval` timer with user-selectable intervals (30s/60s/120s). Each tick calls `GET /api/options-chain/{ticker}`. Timer is paused when circuit breaker is open or rate limit is exceeded.

**Pros:**
- Simple implementation — `setInterval` + `clearInterval` in `useEffect`
- User control over refresh frequency (battery/bandwidth trade-off)
- Compatible with existing HTTP-only backend
- Easy to pause/resume based on circuit breaker or rate limit state
- Consistent with existing 60s polling pattern in `page.tsx`

**Cons:**
- Not truly real-time — minimum 30s latency between updates
- Wasted requests when data hasn't changed (mitigated by backend cache headers)
- Client must manage timer lifecycle (tab visibility, unmount cleanup)

**Effort**: S  
**Risk**: Low

---

### Option 2: Server-Sent Events (SSE)

**Description:**
Backend pushes data updates via SSE stream. Client opens a persistent connection and receives events when new Yahoo Finance data arrives.

**Pros:**
- Lower latency — data pushed immediately on change
- No wasted requests — only sends when data changes
- Built-in browser reconnection (`EventSource` API)

**Cons:**
- Requires backend SSE endpoint implementation (not currently available)
- SSE is unidirectional — no request parameterization per-event
- Azure App Service may timeout long-lived connections (default 230s)
- Adds backend scope to a frontend-focused issue

**Effort**: L (requires backend changes)  
**Risk**: Medium

---

### Option 3: WebSocket with Subscription Model

**Description:**
Bidirectional WebSocket connection. Client subscribes to specific tickers; server pushes updates for subscribed symbols.

**Pros:**
- Bidirectional — client can subscribe/unsubscribe dynamically
- Lowest latency option
- Efficient for multi-ticker monitoring

**Cons:**
- Requires significant backend implementation (WebSocket server, subscription management)
- Proxy/CDN WebSocket support varies (Azure App Service requires configuration)
- Connection management complexity (heartbeat, reconnection, state sync)
- Overkill for 15-20 min delayed data — sub-second latency has no value

**Effort**: XL (requires backend redesign)  
**Risk**: High

---

### Option 4: React Query / TanStack Query

**Description:**
Use TanStack Query for data fetching, caching, background refetching, and stale-while-revalidate pattern.

**Pros:**
- Built-in polling (`refetchInterval`), caching, retry logic
- Devtools for debugging
- Large community, battle-tested
- Automatic garbage collection of unused queries

**Cons:**
- Adds external dependency (~12KB gzipped) to a zero-dependency project
- Diverges from Issue #2's custom hook + Map cache pattern
- Circuit breaker and rate limit tracking still need custom implementation
- Team must learn new API

**Effort**: M  
**Risk**: Low (technically), Medium (pattern consistency)

---

## Rationale

We chose **Option 1 (Client-Side Polling)** because:

1. **Backend constraint**: The FastAPI backend is HTTP-only. SSE and WebSocket require backend changes that are out of scope for this frontend issue. Polling is the only strategy that works without backend modifications.

2. **Data latency alignment**: Yahoo Finance free tier provides 15-20 minute delayed data. Sub-second push latency (SSE/WebSocket) provides zero value — polling every 30-60s is perfectly adequate for data that's already 15 minutes stale.

3. **Pattern consistency**: Issue #2 established `Map` cache + custom hooks + zero dependencies. Introducing React Query would create two competing data-fetching patterns in the same codebase. Custom `useOptionsChain` mirrors `useScanFilters` exactly.

4. **Circuit breaker fits client-side**: Since the frontend directly calls the backend (no BFF), the circuit breaker must live in the client. A standalone `CircuitBreaker` class is ~50 lines of TypeScript, testable in isolation, and reusable across hooks.

5. **Simplicity**: Polling + Map cache + CircuitBreaker class + connection status reducer covers all UX requirements without external dependencies. The total implementation is ~400 lines of TypeScript across 3-4 files.

---

## Consequences

### Positive
- Zero new dependencies — consistent with Issue #2's approach
- `CircuitBreaker` class is reusable across any future API integration hook
- Connection status state machine provides clear UX states for all failure modes
- Rate limit tracking prevents silent data staleness — users always know API status
- `Map` cache with TTL enables instant display of cached data while refreshing in background

### Negative
- Polling is not bandwidth-efficient — requests fire even when data hasn't changed (mitigated by 60s backend cache)
- Client-side circuit breaker doesn't protect the backend — it only protects the user experience (backend must have its own rate limiting)
- Connection status is per-client, not global — two browser tabs may show different states
- Tab visibility management adds complexity (`document.visibilityState` handling to pause polling in background tabs)

### Neutral
- Establishes real-time data pattern for future features (Portfolio Risk #6 will reuse `CircuitBreaker` and `useConnectionStatus`)
- `DataContext` adds a second React Context provider alongside `FilterContext` — nesting order matters for consumers
- Cache key format (`${ticker}:${expiration}`) differs from Issue #2's hash-based keys — intentional for direct lookup

---

## Implementation

**Detailed technical specification**: [SPEC-5.md](../specs/SPEC-5.md)

**High-level implementation plan:**

1. **TypeScript interfaces** — Define `OptionsChain`, `OptionContract`, `Greeks`, `ConnectionState`, `CircuitBreakerState`, `RateLimitState` in `app/types/scanner.ts` (extend existing file)
2. **CircuitBreaker class** — Standalone utility at `app/utils/circuitBreaker.ts` with closed/open/half-open states, configurable threshold and cooldown
3. **DataContext provider** — `app/components/scanner/DataContext.tsx` with `useReducer` managing connection status, data freshness, rate limit counters, and options chain data
4. **useOptionsChain hook** — `app/hooks/useOptionsChain.ts` with polling, cache, circuit breaker integration, and data normalization
5. **useConnectionStatus hook** — `app/hooks/useConnectionStatus.ts` deriving 3-state from consecutive failure count
6. **useRateLimit hook** — `app/hooks/useRateLimit.ts` parsing response headers and maintaining local counter
7. **UI components** — ConnectionStatusBadge, DataFreshnessBar, StaleDataBanner, OptionsChainTable, RateLimitIndicator, GreekTooltip
8. **Integration** — Wire `DataContext` into `ScannerSection.tsx` alongside existing `FilterContext`
9. **Tab visibility** — Pause polling when tab is hidden, resume on focus
10. **Accessibility** — ARIA live regions for connection status changes, screen reader announcements for stale data

**Key milestones:**
- Phase 3a (Week 8): CircuitBreaker + DataContext + useOptionsChain + useConnectionStatus
- Phase 3b (Week 9): OptionsChainTable + Greeks columns + ConnectionStatusBadge + DataFreshnessBar
- Phase 3c (Week 10): RateLimitIndicator + StaleDataBanner + tab visibility + accessibility + polish

---

## References

### Internal
- [PRD-options-scanner-v2.md](../prd/PRD-options-scanner-v2.md) — Feature 3 requirements (Real-Time Yahoo Finance Data Integration)
- [UX-5.md](../ux/UX-5.md) — Component specifications, wireframes, user flows, accessibility requirements
- [ADR-2.md](./ADR-2.md) — Established React Context + useReducer + Map cache pattern
- [SPEC-2.md](../specs/SPEC-2.md) — useScanFilters hook architecture, cache strategy, normalization pattern
- [SPEC-5.md](../specs/SPEC-5.md) — Detailed technical specification for this ADR

### External
- [Circuit Breaker Pattern (Martin Fowler)](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Page Visibility API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [React useReducer documentation](https://react.dev/reference/react/useReducer)
- [Yahoo Finance API Rate Limits](https://developer.yahoo.com/api/)

---

## Review History

| Date | Reviewer | Status | Notes |
|------|----------|--------|-------|
| 2026-02-15 | Solution Architect Agent | Accepted | Initial architecture decision |

---

**Author**: Solution Architect Agent  
**Last Updated**: 2026-02-15
