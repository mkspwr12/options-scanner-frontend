# ADR-4: Modular Data Provider Architecture

**Status**: Accepted  
**Date**: 2026-02-15  
**Author**: Solution Architect Agent  
**Epic**: #1  
**Issue**: #4  
**PRD**: [PRD-options-scanner-v2.md](../prd/PRD-options-scanner-v2.md)  
**UX**: [UX-4.md](../ux/UX-4.md)

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

The Options Scanner frontend currently hardcodes Yahoo Finance as the sole data provider. All fetch calls in `app/page.tsx` target `/api/scan`, `/api/portfolio`, and `/api/watchlist` which in turn proxy to a single Yahoo Finance–backed FastAPI backend. There is no abstraction layer for switching providers, no failover when Yahoo Finance rate-limits (~2,000 req/hr free tier), and no admin-facing UI for managing provider credentials.

The PRD (Feature 9, US-9.1 – US-9.4) requires a modular data provider system where admins can:
- Add, configure, and remove providers (Yahoo Finance, Alpaca, Tradier, custom) from a Settings page
- Define a priority order for automatic failover
- Monitor provider health (latency, error rate, rate-limit consumption)
- Track approximate monthly API costs

The UX design (UX-4.md) specifies a Settings page with provider cards, drag-to-reorder priority, an "Add Provider" modal with connection testing, and a failover notification banner visible on the scanner page.

**Requirements:**
- TypeScript-first provider interface with compile-time safety
- Failover < 500ms (user sees shimmer, not a blank screen)
- Provider credentials stored server-side (not localStorage — sensitive API keys)
- Connection test before save (mandatory — UX flow step 4)
- Rate-limit gauge per provider (real-time percentage on each card)
- WCAG 2.1 AA for the entire Settings page (keyboard drag-reorder, screen reader announcements)
- Settings page loads in < 200ms (skeleton → hydrated)

**Constraints:**
- Next.js 14 / React 18 / TypeScript 5.5 — no additional state management library (consistent with ADR-2)
- Backend is FastAPI (Python) — REST endpoints only, no WebSocket for v1
- 1–2 engineers, Phase 5 timeline (Weeks 11–13 per PRD)
- Existing patterns: `FilterContext` + `useReducer` (ADR-2), CSS Modules for styling, component folder per feature under `app/components/`

**Background:**
ADR-2 established React Context + `useReducer` as the state management pattern. ADR-3 established the strategy builder component pattern. This decision extends those patterns to provider management while introducing a new service-layer abstraction (`IDataProvider`) that decouples the frontend from any specific data source.

---

## Decision

We will implement a modular data provider architecture consisting of three layers: a **TypeScript interface abstraction** (`IDataProvider`) with a factory pattern, a **client-side `ProviderManager`** class for failover orchestration, and a **React Context** (`ProviderContext` + `useReducer`) for UI state — with provider configuration persisted server-side via a `/api/providers` REST endpoint.

**Key architectural choices:**

1. **Provider abstraction pattern** — A TypeScript `IDataProvider` interface with methods `getOptionsChain()`, `getQuote()`, `testConnection()`, and `getStatus()`. Concrete implementations (Yahoo, Alpaca, Tradier) are instantiated via a `ProviderFactory.create(config)` factory function. All implementations live client-side as a service layer that wraps `fetch()` calls to the backend's provider-specific proxy endpoints.

2. **Provider configuration storage** — Server-side via `/api/providers` REST endpoint (GET list, POST add, PUT update, DELETE remove). API keys are encrypted at rest in the backend and masked (`****xxxx`) in GET responses. The frontend never stores raw API keys — only the backend decrypts them when proxying requests.

3. **Failover mechanism** — A client-side `ProviderManager` class that maintains a priority queue of active providers. Each provider has an independent circuit breaker (trips after 3 consecutive errors, cooldown 5 minutes). When the primary provider fails, `ProviderManager` switches to the next healthy provider in priority order in < 500ms. Health checks run against the cooldown provider and auto-restore when healthy.

4. **Settings UI pattern** — A dedicated `ProviderSettingsPage` component under `app/components/settings/` with modal forms for add/edit. Consistent with the existing FilterPanel / PresetsBar modal patterns. Provider cards support drag-to-reorder for priority management.

5. **Provider state management** — `ProviderContext` wrapping the app root, using `useReducer` with typed actions (`ADD_PROVIDER`, `REMOVE_PROVIDER`, `UPDATE_PROVIDER`, `SET_ACTIVE`, `SET_FAILOVER_STATE`, `UPDATE_METRICS`). Follows the same pattern as `FilterContext` from ADR-2.

6. **Connection testing** — Async POST to `/api/providers/{id}/test` which performs a round-trip health check to the provider's API. The frontend shows a spinner on the "Test Connection" button and displays latency on success or a specific error message on failure (401, timeout, DNS). The "Save" button is disabled until a test passes.

7. **Metrics collection** — Client-side tracking of response times and error counts per provider, aggregated into per-provider `ProviderMetrics` objects. Metrics are held in `ProviderContext` state and displayed on provider cards (latency avg, error rate %, calls/hr, rate-limit gauge). No server-side metrics aggregation in v1.

---

## Options Considered

### Option 1: TypeScript Interface + Factory Pattern (Client-Side Service Layer)

**Description:**
Define `IDataProvider` as a TypeScript interface. Concrete provider classes implement it. A `ProviderFactory` function maps `ProviderType` enum values to class constructors. The `ProviderManager` orchestrates failover by maintaining a priority-sorted list of `IDataProvider` instances.

**Pros:**
- Compile-time type safety — adding a new provider requires implementing all interface methods
- Open/closed principle — new providers extend without modifying existing code
- Factory pattern keeps instantiation logic centralized
- Client-side failover is instant (no round-trip to backend for switching)

**Cons:**
- Client-side provider logic means business logic lives in the frontend
- Each provider implementation is a thin wrapper around `fetch()` — minimal runtime logic

**Effort**: M  
**Risk**: Low

---

### Option 2: Backend-Only Provider Abstraction (Frontend Unaware)

**Description:**
All provider switching happens on the backend. The frontend calls a single `/api/data` endpoint and the backend decides which provider to use. The frontend has no concept of providers.

**Pros:**
- Frontend stays simple — one endpoint, no provider logic
- API keys never leave the backend (even masked)
- Failover logic centralized on the server

**Cons:**
- No admin UI for provider management (requires backend dashboard or CLI)
- Failover latency depends on backend response time (not client-side controllable)
- No client-side metrics visibility without a separate metrics endpoint
- Contradicts UX-4 which specifies a frontend Settings page for provider management

**Effort**: L  
**Risk**: Medium — violates PRD/UX requirements for admin self-service

---

### Option 3: Third-Party Service Mesh (e.g., Kong, Envoy Sidecar)

**Description:**
Use an API gateway / service mesh to handle provider routing, failover, and rate limiting. The frontend talks only to the gateway.

**Pros:**
- Battle-tested failover and circuit breaker implementations
- Built-in rate limiting, retries, observability
- Language-agnostic — works with any backend

**Cons:**
- Massive infrastructure overhead for a 1–2 person team
- No frontend admin UI without custom dashboard
- Overkill for 2–3 providers at Yahoo-Finance scale (~2K req/hr)
- Adds operational complexity (deployment, monitoring, cost)

**Effort**: XL  
**Risk**: High — operational complexity far exceeds team capacity

---

## Rationale

We chose **Option 1 (TypeScript Interface + Factory Pattern)** because:

1. **UX-driven requirement**: The PRD and UX-4 specify a frontend Settings page where admins manage providers. Option 2 (backend-only) and Option 3 (service mesh) cannot deliver this without significant additional work. The provider abstraction must live where the UI consumes it.

2. **Consistent with existing patterns**: ADR-2 established React Context + `useReducer` as the state management pattern. The `ProviderContext` follows the exact same pattern as `FilterContext`, reducing cognitive load for engineers who already know the codebase.

3. **Right-sized for scale**: We have 2–3 providers with ~2,000 req/hr combined. A service mesh (Option 3) is designed for thousands of microservices and millions of requests — it would add 10x the infrastructure cost for no material benefit.

4. **Client-side failover is faster**: Switching providers on the client (< 500ms) is faster than a backend round-trip (200–500ms network + backend processing). The user sees a brief shimmer instead of a spinner.

5. **Security via server-side storage**: API keys are stored encrypted on the backend and never sent to the frontend in plaintext. The `IDataProvider` implementations call backend proxy endpoints that inject the real API key server-side. This gives us the developer experience of client-side failover with the security of server-side credential management.

6. **Factory pattern enables extensibility**: Adding a "Custom" provider type requires only implementing the `IDataProvider` interface and registering it in the factory map. No changes to `ProviderManager`, `ProviderContext`, or UI components.

**Key decision factors:**
- Team size (1–2 engineers) favors patterns already in the codebase
- Security (API keys) requires server-side storage regardless of client/server split
- UX spec mandates frontend provider management UI — backend-only is not viable
- Failover speed (< 500ms) is best achieved client-side

---

## Consequences

### Positive
- Clean separation of concerns: `IDataProvider` (data access) → `ProviderManager` (failover) → `ProviderContext` (UI state) → components (rendering)
- Adding a new provider is a 1-file task (implement `IDataProvider`, register in factory)
- Failover is transparent to the user — brief shimmer + notification banner, never a blank screen
- Provider metrics visible in Settings UI help admins proactively manage rate limits
- API keys are never stored or exposed on the client side

### Negative
- Client-side `ProviderManager` duplicates some logic that could live on the backend (failover routing) — acceptable tradeoff for < 500ms switching
- Circuit breaker state is per-browser-session — if two admins are online simultaneously, they have independent circuit breaker states (acceptable for v1, team size is small)
- Metrics are client-side only — they reset on page refresh. Server-side metrics aggregation deferred to Phase 6

### Neutral
- Establishes a service-layer pattern (`app/services/`) that future features can follow
- Introduces the Settings page navigation pattern (tabs: General, Data Providers, Notifications, Account)
- `ProviderContext` wraps the app root (unlike `FilterContext` which wraps only the scanner section) — needed because failover banners appear globally

---

## Implementation

**Detailed technical specification**: [SPEC-4.md](../specs/SPEC-4.md)

**High-level implementation plan:**

1. **Define TypeScript interfaces** — `IDataProvider`, `ProviderConfig`, `ProviderMetrics`, `ProviderStatus`, `ProviderType` enum in `app/types/provider.ts`
2. **Implement ProviderFactory** — Factory function mapping `ProviderType` → concrete implementation in `app/services/providerFactory.ts`
3. **Implement concrete providers** — `YahooProvider`, `AlpacaProvider`, `TradierProvider` classes in `app/services/providers/`
4. **Build ProviderManager** — Failover orchestration class with priority queue and circuit breaker in `app/services/providerManager.ts`
5. **Create ProviderContext** — React Context + `useReducer` with typed actions in `app/contexts/ProviderContext.tsx`
6. **Build useProviders hook** — CRUD operations, test connection, reorder priority in `app/hooks/useProviders.ts`
7. **Build useProviderMetrics hook** — Track call counts, latency, error rates in `app/hooks/useProviderMetrics.ts`
8. **Create Settings page** — `ProviderSettingsPage`, `ProviderCard`, `ProviderFormModal`, `ConnectionTestButton`, `RateLimitGauge`, `ProviderMetricsPanel`, `ProviderPriorityList` in `app/components/settings/`
9. **Create FailoverBanner** — Global notification component in `app/components/primitives/FailoverBanner.tsx`
10. **Integrate with `/api/providers`** — REST endpoint integration (GET, POST, PUT, DELETE, POST test)
11. **Accessibility pass** — ARIA attributes, keyboard drag-reorder, screen reader announcements per UX-4 Section 8
12. **Performance optimization** — Skeleton loading, `React.memo` on provider cards, debounced metrics updates

**Key milestones:**
- Phase 5a (Week 11): TypeScript interfaces + ProviderFactory + ProviderManager + ProviderContext
- Phase 5b (Week 12): Settings page UI + provider CRUD + connection testing
- Phase 5c (Week 13): Failover banner + metrics panel + accessibility + polish

---

## References

### Internal
- [PRD-options-scanner-v2.md](../prd/PRD-options-scanner-v2.md) — Feature 9 requirements (US-9.1 – US-9.4)
- [UX-4.md](../ux/UX-4.md) — Settings page wireframes, user flows, component specifications
- [ADR-2.md](ADR-2.md) — Established React Context + useReducer pattern
- [SPEC-4.md](../specs/SPEC-4.md) — Detailed technical specification

### External
- [TypeScript Handbook: Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
- [Circuit Breaker pattern (Martin Fowler)](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Factory Method pattern](https://refactoring.guru/design-patterns/factory-method)
- [WCAG 2.1 AA Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [React useReducer documentation](https://react.dev/reference/react/useReducer)

---

## Review History

| Date | Reviewer | Status | Notes |
|------|----------|--------|-------|
| 2026-02-15 | Solution Architect Agent | Accepted | Initial architecture decision |

---

**Author**: Solution Architect Agent  
**Last Updated**: 2026-02-15
