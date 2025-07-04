import { Logger } from './Logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  describe('constructor', () => {
    it('should initialize with empty errors and warnings', () => {
      expect(Object.keys(logger.errors)).toHaveLength(0);
      expect(Object.keys(logger.warnings)).toHaveLength(0);
    });
  });

  describe('addError', () => {
    it('should add error without context', () => {
      const error: Logger.Error = { code: 'E001', message: 'Test error' };
      
      logger.addError(error);
      
      expect(logger.errors['E001']).toBeDefined();
      expect(logger.errors['E001'].amount).toBe(1);
      expect(logger.errors['E001'].errors).toHaveLength(1);
      expect(logger.errors['E001'].errors[0].message).toBe('Test error');
      expect(logger.errors['E001'].errors[0].contexts).toHaveLength(0);
    });

    it('should add error with context', () => {
      const error: Logger.Error = { code: 'E001', message: 'Test error', context: 'test-context' };
      
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
      const warning: Logger.Warning = { code: 'W001', message: 'Test warning' };
      
      logger.addWarning(warning);
      
      expect(logger.warnings['W001']).toBeDefined();
      expect(logger.warnings['W001'].amount).toBe(1);
      expect(logger.warnings['W001'].warnings).toHaveLength(1);
      expect(logger.warnings['W001'].warnings[0].message).toBe('Test warning');
      expect(logger.warnings['W001'].warnings[0].contexts).toHaveLength(0);
    });

    it('should add warning with context', () => {
      const warning: Logger.Warning = { code: 'W001', message: 'Test warning', context: 'test-context' };
      
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
      // Add an error with many contexts
      for (let i = 0; i < 20; i++) {
        logger.addError({ 
          code: 'E999', 
          message: 'Many contexts', 
          context: `context-${i}` 
        });
      }

      const response = logger.getResponse();
      const errorWithManyContexts = response.errors.find(e => e.code === 'E999');
      
      expect(errorWithManyContexts?.contexts).toHaveLength(10);
    });

    it('should return contexts sorted by frequency', () => {
      // Add contexts with different frequencies
      logger.addError({ code: 'E888', message: 'Test', context: 'freq1' });
      logger.addError({ code: 'E888', message: 'Test', context: 'freq3' });
      logger.addError({ code: 'E888', message: 'Test', context: 'freq3' });
      logger.addError({ code: 'E888', message: 'Test', context: 'freq3' });
      logger.addError({ code: 'E888', message: 'Test', context: 'freq2' });
      logger.addError({ code: 'E888', message: 'Test', context: 'freq2' });

      const response = logger.getResponse();
      const testError = response.errors.find(e => e.code === 'E888');
      
      expect(testError?.contexts[0]).toBe('freq3'); // Most frequent first
      expect(testError?.contexts[1]).toBe('freq2');
      expect(testError?.contexts[2]).toBe('freq1');
    });

    it('should not include amount in response', () => {
      logger.addError({ code: 'E001', message: 'Test error' });
      
      const response = logger.getResponse();
      
      expect(response.errors[0]).not.toHaveProperty('amount');
      expect(response.errors[0]).toHaveProperty('code');
      expect(response.errors[0]).toHaveProperty('message');
      expect(response.errors[0]).toHaveProperty('contexts');
    });

    it('should handle empty logger', () => {
      const emptyLogger = new Logger();
      const response = emptyLogger.getResponse();
      
      expect(response.errors).toHaveLength(0);
      expect(response.warnings).toHaveLength(0);
    });
  });

  describe('new granular methods', () => {
    beforeEach(() => {
      logger.addError({ code: 'E001', message: 'Test error', context: 'test-context' });
      logger.addError({ code: 'E001', message: 'Test error', context: 'another-context' });
      logger.addWarning({ code: 'W001', message: 'Test warning', context: 'warning-context' });
    });

    describe('hasError', () => {
      it('should return true for existing error code', () => {
        expect(logger.hasError('E001')).toBe(true);
      });

      it('should return false for non-existing error code', () => {
        expect(logger.hasError('E999')).toBe(false);
      });
    });

    describe('hasWarning', () => {
      it('should return true for existing warning code', () => {
        expect(logger.hasWarning('W001')).toBe(true);
      });

      it('should return false for non-existing warning code', () => {
        expect(logger.hasWarning('W999')).toBe(false);
      });
    });

    describe('getError', () => {
      it('should return error group for existing error code', () => {
        const errorGroup = logger.getError('E001');
        
        expect(errorGroup).toBeDefined();
        expect(errorGroup?.amount).toBe(2);
        expect(errorGroup?.errors).toHaveLength(1);
        expect(errorGroup?.errors[0].message).toBe('Test error');
        expect(errorGroup?.errors[0].contexts).toHaveLength(2);
      });

      it('should return undefined for non-existing error code', () => {
        const errorGroup = logger.getError('E999');
        
        expect(errorGroup).toBeUndefined();
      });
    });

    describe('getWarning', () => {
      it('should return warning group for existing warning code', () => {
        const warningGroup = logger.getWarning('W001');
        
        expect(warningGroup).toBeDefined();
        expect(warningGroup?.amount).toBe(1);
        expect(warningGroup?.warnings).toHaveLength(1);
        expect(warningGroup?.warnings[0].message).toBe('Test warning');
        expect(warningGroup?.warnings[0].contexts).toHaveLength(1);
      });

      it('should return undefined for non-existing warning code', () => {
        const warningGroup = logger.getWarning('W999');
        
        expect(warningGroup).toBeUndefined();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle complex object contexts for errors', () => {
      const complexContext = { 
        nested: { value: 123 }, 
        array: [1, 2, 3], 
        func: () => 'test' 
      };
      
      logger.addError({ 
        code: 'E001', 
        message: 'Complex context', 
        context: complexContext 
      });
      
      expect(logger.errors['E001'].errors[0].contexts[0].context).toBe(complexContext);
    });

    it('should handle many duplicate errors efficiently', () => {
      const startTime = performance.now();
      
      // Add 1000 duplicate errors
      for (let i = 0; i < 1000; i++) {
        logger.addError({ 
          code: 'E001', 
          message: 'Duplicate error', 
          context: 'same-context' 
        });
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(logger.errors['E001'].amount).toBe(1000);
      expect(logger.errors['E001'].errors).toHaveLength(1);
      expect(logger.errors['E001'].errors[0].contexts).toHaveLength(1);
      expect(logger.errors['E001'].errors[0].contexts[0].amount).toBe(1000);
    });
  });
}); 