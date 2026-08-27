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
}

export function logDebug(message: string, ...args: any[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, ...args);
  }
}
