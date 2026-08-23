/**
 * Client-side rate limiter for Stellar/Soroban contract calls.
 * Prevents accidental submission spam and enforces cooldowns
 * between consecutive grant submissions.
 */

export interface RateLimitConfig {
  maxCalls: number;     // Max calls allowed in the window
  windowMs: number;     // Time window in milliseconds
}

interface RateLimitState {
  calls: number[];      // Timestamps of recent calls
  config: RateLimitConfig;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  submitGrant: { maxCalls: 3, windowMs: 60_000 },      // 3 submits per minute
  releaseMilestone: { maxCalls: 5, windowMs: 60_000 }, // 5 releases per minute
  rejectGrant: { maxCalls: 5, windowMs: 60_000 },      // 5 rejects per minute
};

const rateLimitStates = new Map<string, RateLimitState>();

/**
 * Initialize a rate limit state for an action
 */
function getState(action: string): RateLimitState {
  if (!rateLimitStates.has(action)) {
    const config = DEFAULT_CONFIGS[action] ?? { maxCalls: 10, windowMs: 60_000 };
    rateLimitStates.set(action, { calls: [], config });
  }
  return rateLimitStates.get(action)!;
}

/**
 * Check if an action is allowed within its rate limit window.
 * Returns true if the call is allowed, false if rate limited.
 * Purges expired timestamps automatically.
 */
export function isRateLimitAllowed(action: string): boolean {
  const state = getState(action);
  const now = Date.now();
  const windowStart = now - state.config.windowMs;

  // Purge calls outside the window
  state.calls = state.calls.filter(t => t > windowStart);

  return state.calls.length < state.config.maxCalls;
}

/**
 * Record a call for the given action.
 * Should be called immediately after performing the rate-limited action.
 */
export function recordCall(action: string): void {
  const state = getState(action);
  const now = Date.now();
  const windowStart = now - state.config.windowMs;
  state.calls = state.calls.filter(t => t > windowStart);
  state.calls.push(now);
}

/**
 * Get remaining calls allowed for an action in the current window
 */
export function getRemainingCalls(action: string): number {
  const state = getState(action);
  const now = Date.now();
  const windowStart = now - state.config.windowMs;
  const recentCalls = state.calls.filter(t => t > windowStart).length;
  return Math.max(0, state.config.maxCalls - recentCalls);
}

/**
 * Get time in ms until the rate limit resets for an action
 */
export function getResetTimeMs(action: string): number {
  const state = getState(action);
  const now = Date.now();
  const windowStart = now - state.config.windowMs;
  const recentCalls = state.calls.filter(t => t > windowStart);

  if (recentCalls.length < state.config.maxCalls) return 0;

  const oldestCall = Math.min(...recentCalls);
  return Math.max(0, oldestCall + state.config.windowMs - now);
}

/**
 * Reset rate limit state for an action (useful for testing)
 */
export function resetRateLimit(action: string): void {
  rateLimitStates.delete(action);
}
