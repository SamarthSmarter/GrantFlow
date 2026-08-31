/**
 * Client-side logger utility to standardize console output.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export function logInfo(message: string, ...args: any[]): void {
  console.info(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
}

export function logWarn(message: string, ...args: any[]): void {
  console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
}

export function logError(message: string, error?: unknown, ...args: any[]): void {
  console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error, ...args);
  
  // Simulated external error reporting (e.g., Sentry)
  if (process.env.NODE_ENV === 'production') {
    console.info('📡 [Monitoring] Error payload sent to Sentry/DataDog (Simulated)', { message, error });
  }
}

export function logDebug(message: string, ...args: any[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, ...args);
  }
}

/**
 * Analytics Tracking (Simulated for Level 4 Submission)
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  // In a real startup, this would push to PostHog, Mixpanel, or Google Analytics
  console.info(`📊 [Analytics] Event: ${eventName}`, properties || {});
}

export function trackUserOnboarding(walletAddress: string): void {
  trackEvent('User_Onboarded', { wallet: walletAddress, timestamp: new Date().toISOString() });
}

