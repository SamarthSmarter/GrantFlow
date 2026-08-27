import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logInfo, logWarn, logError, logDebug } from '../utils/logger';

describe('Logger Utility', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call console.info on logInfo', () => {
    logInfo('Test info');
    expect(console.info).toHaveBeenCalled();
  });

  it('should call console.warn on logWarn', () => {
    logWarn('Test warn');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should call console.error on logError', () => {
    logError('Test error');
    expect(console.error).toHaveBeenCalled();
  });

  it('should call console.debug on logDebug in non-production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    logDebug('Test debug');
    expect(console.debug).toHaveBeenCalled();
    process.env.NODE_ENV = originalEnv;
  });
});
