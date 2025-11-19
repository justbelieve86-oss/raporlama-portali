import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log', () => {
    it('should log message in development', () => {
      logger.log('Test message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log message with context', () => {
      const context = { key: 'value' };
      logger.log('Test message', context);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message')
      );
    });

    it('should handle Error context', () => {
      const error = new Error('Test error');
      logger.log('Test message', error);
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should warn message', () => {
      logger.warn('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should warn with context', () => {
      const context = { key: 'value' };
      logger.warn('Warning message', context);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle Error context', () => {
      const error = new Error('Test error');
      logger.warn('Warning message', error);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should error message', () => {
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should error with context', () => {
      const context = { key: 'value' };
      logger.error('Error message', context);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle Error context and log stack', () => {
      const error = new Error('Test error');
      logger.error('Error message', error);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // message + error stack
    });

    it('should handle unknown context', () => {
      logger.error('Error message', 'string context');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should debug message in development', () => {
      logger.debug('Debug message');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('should debug with context', () => {
      const context = { key: 'value' };
      logger.debug('Debug message', context);
      expect(consoleDebugSpy).toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should info message in development', () => {
      logger.info('Info message');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should info with context', () => {
      const context = { key: 'value' };
      logger.info('Info message', context);
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('normalizeContext', () => {
    it('should handle object context', () => {
      const context = { key: 'value', nested: { prop: 'val' } };
      logger.log('Test', context);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test')
      );
    });

    it('should handle undefined context', () => {
      logger.log('Test', undefined);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle null context', () => {
      logger.log('Test', null);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle primitive context', () => {
      logger.log('Test', 123);
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});

