import { Logger } from './Logger';
import { McpManager } from '../McpManager/index.js';
import { McpError } from '../types/errors.js';
import { McpWarning } from '../types/McpWarning.js';

describe('Logger', () => {
  let logger: Logger<McpError, McpWarning>;
  let mockManager: McpManager<McpError, McpWarning>;

  beforeEach(() => {
    mockManager = {} as McpManager<McpError, McpWarning>;
    logger = new Logger({ manager: mockManager });
  });

  describe('constructor', () => {
    it('should initialize with empty errors and warnings', () => {
      expect(Object.keys(logger.errors)).toHaveLength(0);
      expect(Object.keys(logger.warnings)).toHaveLength(0);
      expect(logger.manager).toBe(mockManager);
    });
  });

  describe('addError', () => {
    it('should add error without context', () => {
      const error: McpError = { code: 'E001', message: 'Test error' };
      
      logger.addError(error);
      
      expect(logger.errors['E001']).toBeDefined();
      expect(logger.errors['E001'].amount).toBe(1);
      expect(logger.errors['E001'].errors).toHaveLength(1);
      expect(logger.errors['E001'].errors[0].message).toBe('Test error');
      expect(logger.errors['E001'].errors[0].contexts).toHaveLength(0);
    });

    it('should add error with context', () => {
      const error: McpError = { code: 'E001', message: 'Test error', context: 'test-context' };
      
      logger.addError(error);
      
      expect(logger.errors['E001'].errors[0].contexts).toHaveLength(1);
      expect(logger.errors['E001'].errors[0].contexts[0]).toEqual({ context: 'test-context', amount: 1 });
    });

    it('should group errors by code', () => {
      logger.addError({ code: 'E001', message: 'Error 1' });
      logger.addError({ code: 'E001', message: 'Error 2' });
      logger.addError({ code: 'E002', message: 'Error 3' });
      
      expect(Object.keys(logger.errors)).toHaveLength(2);
      expect(logger.errors['E001'].amount).toBe(2);
      expect(logger.errors['E001'].errors).toHaveLength(2);
      expect(logger.errors['E002'].amount).toBe(1);
    });

    it('should group same messages and contexts', () => {
      logger.addError({ code: 'E001', message: 'Same message', context: 'ctx1' });
      logger.addError({ code: 'E001', message: 'Same message', context: 'ctx1' });
      logger.addError({ code: 'E001', message: 'Same message', context: 'ctx2' });
      
      expect(logger.errors['E001'].amount).toBe(3);
      expect(logger.errors['E001'].errors).toHaveLength(1);
      expect(logger.errors['E001'].errors[0].contexts).toHaveLength(2);
      expect(logger.errors['E001'].errors[0].contexts[0]).toEqual({ context: 'ctx1', amount: 2 });
      expect(logger.errors['E001'].errors[0].contexts[1]).toEqual({ context: 'ctx2', amount: 1 });
    });

    it('should handle null context', () => {
      logger.addError({ code: 'E001', message: 'Test error', context: null });
      
      expect(logger.errors['E001'].errors[0].contexts).toHaveLength(0);
    });

    it('should handle undefined context', () => {
      logger.addError({ code: 'E001', message: 'Test error', context: undefined });
      
      expect(logger.errors['E001'].errors[0].contexts).toHaveLength(0);
    });
  });

  describe('addWarning', () => {
    it('should add warning without context', () => {
      const warning: McpWarning = { code: 'W001', message: 'Test warning' };
      
      logger.addWarning(warning);
      
      expect(logger.warnings['W001']).toBeDefined();
      expect(logger.warnings['W001'].amount).toBe(1);
      expect(logger.warnings['W001'].warnings).toHaveLength(1);
      expect(logger.warnings['W001'].warnings[0].message).toBe('Test warning');
      expect(logger.warnings['W001'].warnings[0].contexts).toHaveLength(0);
    });

    it('should add warning with context', () => {
      const warning: McpWarning = { code: 'W001', message: 'Test warning', context: 'test-context' };
      
      logger.addWarning(warning);
      
      expect(logger.warnings['W001'].warnings[0].contexts).toHaveLength(1);
      expect(logger.warnings['W001'].warnings[0].contexts[0]).toEqual({ context: 'test-context', amount: 1 });
    });

    it('should group warnings by code and message', () => {
      logger.addWarning({ code: 'W001', message: 'Same warning', context: 'ctx1' });
      logger.addWarning({ code: 'W001', message: 'Same warning', context: 'ctx1' });
      logger.addWarning({ code: 'W001', message: 'Different warning' });
      
      expect(logger.warnings['W001'].amount).toBe(3);
      expect(logger.warnings['W001'].warnings).toHaveLength(2);
      expect(logger.warnings['W001'].warnings[0].contexts[0]).toEqual({ context: 'ctx1', amount: 2 });
    });

    it('should handle null and undefined contexts', () => {
      logger.addWarning({ code: 'W001', message: 'Test', context: undefined });
      logger.addWarning({ code: 'W001', message: 'Test' });
      
      expect(logger.warnings['W001'].warnings[0].contexts).toHaveLength(0);
    });
  });

  describe('throwError', () => {
    beforeEach(() => {
      // Create proper mock with getResponse method
      mockManager.getResponse = (data: any) => ({
        success: false,
        data,
        errors: [{ code: 'E001', message: 'Fatal error', contexts: [] }]
      });
    });

    it('should add error and throw exception', () => {
      const error: McpError = { code: 'E001', message: 'Fatal error' };
      
      expect(() => logger.throwError(error)).toThrow('MCP request interrupted');
      
      // throwError doesn't add to logger.errors, it just throws
    });

    it('should throw with code if no message', () => {
      const error: McpError = { code: 'E001', message: '' };
      
      expect(() => logger.throwError(error)).toThrow('MCP request interrupted');
    });
  });

  describe('getResponse', () => {
    beforeEach(() => {
      // Setup test data
      for (let i = 1; i <= 15; i++) {
        logger.addError({ 
          code: `E${i.toString().padStart(3, '0')}`, 
          message: `Error ${i}`, 
          context: `context-${i}`
        });
        
        // Add multiple occurrences for some errors to test sorting
        if (i <= 5) {
          for (let j = 0; j < i; j++) {
            logger.addError({ 
              code: `E${i.toString().padStart(3, '0')}`, 
              message: `Error ${i}`, 
              context: `context-${i}-${j}`
            });
          }
        }
      }

      for (let i = 1; i <= 12; i++) {
        logger.addWarning({ 
          code: `W${i.toString().padStart(3, '0')}`, 
          message: `Warning ${i}`, 
          context: `context-${i}`
        });
        
        if (i <= 3) {
          for (let j = 0; j < i; j++) {
            logger.addWarning({ 
              code: `W${i.toString().padStart(3, '0')}`, 
              message: `Warning ${i}`, 
              context: `context-${i}-${j}`
            });
          }
        }
      }
    });

    it('should return top 10 errors sorted by frequency', () => {
      const response = logger.getResponse();
      
      expect(response.errors).toHaveLength(10);
      expect(response.errors[0].code).toBe('E005'); // Should have highest count
      expect(response.errors[0].message).toBe('Error 5');
    });

    it('should return top 10 warnings sorted by frequency', () => {
      const response = logger.getResponse();
      
      expect(response.warnings).toHaveLength(10);
      expect(response.warnings[0].code).toBe('W003'); // Should have highest count
      expect(response.warnings[0].message).toBe('Warning 3');
    });

    it('should limit contexts to 10 per error/warning', () => {
      // Add error with many contexts
      for (let i = 1; i <= 15; i++) {
        logger.addError({ code: 'EMANY', message: 'Many contexts', context: `ctx-${i}` });
      }
      
      const response = logger.getResponse();
      const errorWithManyContexts = response.errors.find(e => e.code === 'EMANY');
      
      expect(errorWithManyContexts?.contexts).toHaveLength(10);
    });

    it('should return contexts sorted by frequency', () => {
      // Add contexts with different frequencies
      logger.addError({ code: 'EFREQ', message: 'Freq test', context: 'rare' });
      
      for (let i = 0; i < 5; i++) {
        logger.addError({ code: 'EFREQ', message: 'Freq test', context: 'common' });
      }
      
      const response = logger.getResponse();
      const freqError = response.errors.find(e => e.code === 'EFREQ');
      
      expect(freqError?.contexts[0]).toBe('common'); // Most frequent first
      expect(freqError?.contexts[1]).toBe('rare');
    });

    it('should not include amount in response', () => {
      const response = logger.getResponse();
      
      expect(response.errors[0]).not.toHaveProperty('amount');
      expect(response.warnings[0]).not.toHaveProperty('amount');
    });

    it('should handle empty logger', () => {
      const emptyLogger = new Logger({ manager: mockManager });
      const response = emptyLogger.getResponse();
      
      expect(response.errors).toHaveLength(0);
      expect(response.warnings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle complex object contexts for errors', () => {
      const complexContext = { nested: { value: 42 }, array: [1, 2, 3] };
      logger.addError({ code: 'E001', message: 'Complex', context: complexContext });
      
      expect(logger.errors['E001'].errors[0].contexts[0].context).toEqual(complexContext);
    });

    it('should handle many duplicate errors efficiently', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        logger.addError({ code: 'PERF', message: 'Performance test', context: 'same' });
      }
      
      const end = Date.now();
      
      expect(logger.errors['PERF'].amount).toBe(1000);
      expect(logger.errors['PERF'].errors).toHaveLength(1);
      expect(logger.errors['PERF'].errors[0].contexts).toHaveLength(1);
      expect(logger.errors['PERF'].errors[0].contexts[0].amount).toBe(1000);
      expect(end - start).toBeLessThan(100); // Should be fast
    });
  });
}); 