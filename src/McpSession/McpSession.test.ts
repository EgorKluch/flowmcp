import { McpSession, McpInterruptError } from './McpSession';

describe('McpSession', () => {
  let session: McpSession;

  beforeEach(() => {
    session = new McpSession();
  });

  describe('constructor', () => {
    it('should initialize with logger', () => {
      expect(session.logger).toBeDefined();
    });

    it('should accept empty options', () => {
      const sessionWithOpts = new McpSession({});
      expect(sessionWithOpts.logger).toBeDefined();
    });
  });

  describe('throwError', () => {
    it('should throw McpInterruptError', () => {
      const error: McpSession.Error = {
        code: 'CRITICAL_ERROR',
        message: 'Critical error occurred'
      };

      expect(() => session.throwError(error)).toThrow(McpInterruptError);
    });

    it('should include error in response', () => {
      const error: McpSession.Error = {
        code: 'CRITICAL_ERROR',
        message: 'Critical error occurred',
        context: { detail: 'test context' }
      };

      try {
        session.throwError(error);
      } catch (thrownError) {
        expect(thrownError).toBeInstanceOf(McpInterruptError);
        const mcpError = thrownError as McpInterruptError;
        expect(mcpError.response.success).toBe(false);
        expect(mcpError.response.data.criticalError).toEqual(error);
      }
    });

    it('should have proper error message', () => {
      const error: McpSession.Error = {
        code: 'TEST_ERROR',
        message: 'Test error'
      };

      expect(() => session.throwError(error)).toThrow('MCP request interrupted');
    });

    it('should have isMcpInterrupt flag', () => {
      const error: McpSession.Error = {
        code: 'TEST_ERROR',
        message: 'Test error'
      };

      try {
        session.throwError(error);
      } catch (thrownError) {
        expect((thrownError as McpInterruptError).isMcpInterrupt).toBe(true);
      }
    });
  });

  describe('getResponse', () => {
    it('should return success response when no errors', () => {
      const result = session.getResponse('test data');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('test data');
    });

    it('should return error response when errors exist', () => {
      session.logger.addError({
        code: 'SESSION_ERROR',
        message: 'Session error'
      });

      const result = session.getResponse('test data');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data).toBe('test data');
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].code).toBe('SESSION_ERROR');
      }
    });

    it('should include warnings in success response', () => {
      session.logger.addWarning({
        code: 'SESSION_WARNING',
        message: 'Session warning'
      });

      const result = session.getResponse('test data');
      
      expect(result.success).toBe(true);
      expect(result.warnings?.length).toBe(1);
      expect(result.warnings?.[0].code).toBe('SESSION_WARNING');
    });

    it('should include warnings in error response', () => {
      session.logger.addError({
        code: 'SESSION_ERROR',
        message: 'Session error'
      });
      session.logger.addWarning({
        code: 'SESSION_WARNING',
        message: 'Session warning'
      });

      const result = session.getResponse('test data');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBe(1);
        expect(result.warnings?.length).toBe(1);
      }
    });

    it('should handle null data', () => {
      const result = session.getResponse(null);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });

    it('should handle undefined data', () => {
      const result = session.getResponse(undefined);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(undefined);
    });

    it('should handle complex object data', () => {
      const complexData = {
        nested: { value: 42 },
        array: [1, 2, 3],
        func: () => 'test'
      };

      const result = session.getResponse(complexData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(complexData);
    });
  });

  describe('logger integration', () => {
    it('should use logger for errors', () => {
      const error: McpSession.Error = {
        code: 'TEST_ERROR',
        message: 'Test error',
        context: { key: 'value' }
      };

      session.logger.addError(error);
      const result = session.getResponse('test');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe('TEST_ERROR');
        expect(result.errors[0].message).toBe('Test error');
        expect(result.errors[0].contexts).toContainEqual({ key: 'value' });
      }
    });

    it('should use logger for warnings', () => {
      const warning: McpSession.Warning = {
        code: 'TEST_WARNING',
        message: 'Test warning',
        context: { info: 'additional info' }
      };

      session.logger.addWarning(warning);
      const result = session.getResponse('test');

      expect(result.success).toBe(true);
      expect(result.warnings?.[0].code).toBe('TEST_WARNING');
      expect(result.warnings?.[0].message).toBe('Test warning');
      expect(result.warnings?.[0].contexts).toContainEqual({ info: 'additional info' });
    });

    it('should handle multiple errors and warnings', () => {
      session.logger.addError({ code: 'ERROR1', message: 'First error' });
      session.logger.addError({ code: 'ERROR2', message: 'Second error' });
      session.logger.addWarning({ code: 'WARN1', message: 'First warning' });
      session.logger.addWarning({ code: 'WARN2', message: 'Second warning' });

      const result = session.getResponse('test');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBe(2);
        expect(result.warnings?.length).toBe(2);
      }
    });
  });

  describe('error context handling', () => {
    it('should handle errors without context', () => {
      const error: McpSession.Error = {
        code: 'NO_CONTEXT_ERROR',
        message: 'Error without context'
      };

      try {
        session.throwError(error);
      } catch (thrownError) {
        const mcpError = thrownError as McpInterruptError;
        expect(mcpError.response.data.criticalError.context).toBeUndefined();
      }
    });

    it('should preserve error context', () => {
      const error: McpSession.Error = {
        code: 'CONTEXT_ERROR',
        message: 'Error with context',
        context: {
          userId: '123',
          operation: 'test',
          timestamp: Date.now()
        }
      };

      try {
        session.throwError(error);
      } catch (thrownError) {
        const mcpError = thrownError as McpInterruptError;
        expect(mcpError.response.data.criticalError.context).toEqual(error.context);
      }
    });
  });

  describe('response types', () => {
    it('should have correct success response structure', () => {
      const result = session.getResponse('test');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data).toBe('test');
      }
    });

    it('should have correct error response structure', () => {
      session.logger.addError({ code: 'TEST', message: 'Test' });
      const result = session.getResponse('test');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('errors');
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.data).toBe('test');
        expect(Array.isArray(result.errors)).toBe(true);
      }
    });
  });
}); 