// Circuit Breaker for Yahoo Finance API calls (Issue #5)
// Prevents cascading failures by temporarily blocking requests after repeated failures.

import type { CircuitBreakerState } from '../types/yahoo-finance';

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 300_000; // 5 minutes

export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private readonly cooldownMs: number;

  constructor(cooldownMs: number = COOLDOWN_MS) {
    this.cooldownMs = cooldownMs;
  }

  /** Returns true if a request is allowed through the breaker */
  canRequest(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      const now = Date.now();
      if (this.lastFailureTime !== null && now - this.lastFailureTime >= this.cooldownMs) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }

    // half-open: allow one probe request
    return true;
  }

  /** Record a successful request — resets the breaker to closed */
  recordSuccess(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  /** Record a failed request — may trip the breaker to open */
  recordFailure(): void {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
      return;
    }

    if (this.failureCount >= FAILURE_THRESHOLD) {
      this.state = 'open';
    }
  }

  /** Get a snapshot of the circuit breaker state */
  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      cooldownMs: this.cooldownMs,
    };
  }

  /** Reset the breaker to closed / zero failures */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = null;
  }
}
