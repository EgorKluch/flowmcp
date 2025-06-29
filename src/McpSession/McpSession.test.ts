import { McpSession } from './McpSession';
import { Logger } from '../Logger/index.js';

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

  describe('getResult', () => {
    it('should return success CallToolResult when no errors', () => {
      const result = session.getResult('test data');
      
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const content = JSON.parse(result.content[0].text as string);
      expect(content.success).toBe(true);
      expect(content.data).toBe('test data');
    });

    it('should return error CallToolResult when errors exist', () => {
      session.logger.addError({
        code: 'SESSION_ERROR',
        message: 'Session error'
      });

      const result = session.getResult('test data');
      
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const content = JSON.parse(result.content[0].text as string);
      expect(content.success).toBe(false);
      expect(content.data).toBe('test data');
      expect(content.errors.length).toBe(1);
      expect(content.errors[0].code).toBe('SESSION_ERROR');
    });

    it('should include warnings in success result', () => {
      session.logger.addWarning({
        code: 'SESSION_WARNING',
        message: 'Session warning'
      });

      const result = session.getResult('test data');
      
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      const content = JSON.parse(result.content[0].text as string);
      expect(content.success).toBe(true);
      expect(content.warnings?.length).toBe(1);
      expect(content.warnings?.[0].code).toBe('SESSION_WARNING');
    });

    it('should include warnings in error result', () => {
      session.logger.addError({
        code: 'SESSION_ERROR',
        message: 'Session error'
      });
      session.logger.addWarning({
        code: 'SESSION_WARNING',
        message: 'Session warning'
      });

      const result = session.getResult('test data');
      
      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text as string);
      expect(content.success).toBe(false);
      expect(content.errors.length).toBe(1);
      expect(content.warnings?.length).toBe(1);
    });

    it('should handle null data', () => {
      const result = session.getResult(null);
      
      expect(result.isError).toBe(false);
      const content = JSON.parse(result.content[0].text as string);
      expect(content.success).toBe(true);
      expect(content.data).toBe(null);
    });

    it('should handle undefined data', () => {
      const result = session.getResult(undefined);
      
      expect(result.isError).toBe(false);
      const content = JSON.parse(result.content[0].text as string);
      expect(content.success).toBe(true);
      expect(content.data).toBe(undefined);
    });

    it('should handle complex object data', () => {
      const complexData = {
        nested: { value: 42 },
        array: [1, 2, 3],
        string: 'test'
      };

      const result = session.getResult(complexData);
      
      expect(result.isError).toBe(false);
      const content = JSON.parse(result.content[0].text as string);
      expect(content.success).toBe(true);
      expect(content.data).toEqual(complexData);
    });

    it('should not include warnings when none exist', () => {
      const result = session.getResult('test data');
      
      expect(result.isError).toBe(false);
      const content = JSON.parse(result.content[0].text as string);
      expect(content.success).toBe(true);
      expect(content.warnings).toBeUndefined();
    });
  });

  describe('logger integration', () => {
    it('should use logger for errors', () => {
      const error: Logger.Error = {
        code: 'TEST_ERROR',
        message: 'Test error',
        context: { key: 'value' }
      };

      session.logger.addError(error);
      const result = session.getResult('test');

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text as string);
      expect(content.success).toBe(false);
      expect(content.errors[0].code).toBe('TEST_ERROR');
      expect(content.errors[0].message).toBe('Test error');
      expect(content.errors[0].contexts).toContainEqual({ key: 'value' });
    });

    it('should use logger for warnings', () => {
      const warning: Logger.Warning = {
        code: 'TEST_WARNING',
        message: 'Test warning',
        context: { info: 'additional info' }
      };

      session.logger.addWarning(warning);
      const result = session.getResult('test');

      expect(result.isError).toBe(false);
      const content = JSON.parse(result.content[0].text as string);
      expect(content.success).toBe(true);
      expect(content.warnings?.[0].code).toBe('TEST_WARNING');
      expect(content.warnings?.[0].message).toBe('Test warning');
      expect(content.warnings?.[0].contexts).toContainEqual({ info: 'additional info' });
    });

    it('should handle multiple errors and warnings', () => {
      session.logger.addError({ code: 'ERROR1', message: 'First error' });
      session.logger.addError({ code: 'ERROR2', message: 'Second error' });
      session.logger.addWarning({ code: 'WARN1', message: 'First warning' });
      session.logger.addWarning({ code: 'WARN2', message: 'Second warning' });

      const result = session.getResult('test');

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text as string);
      expect(content.success).toBe(false);
      expect(content.errors.length).toBe(2);
      expect(content.warnings?.length).toBe(2);
    });

    it('should prioritize errors over warnings in result status', () => {
      session.logger.addWarning({ code: 'WARN', message: 'Warning' });
      session.logger.addError({ code: 'ERROR', message: 'Error' });
      session.logger.addWarning({ code: 'WARN2', message: 'Another warning' });

      const result = session.getResult('test');

      expect(result.isError).toBe(true); // Should be error because errors exist
      const content = JSON.parse(result.content[0].text as string);
      expect(content.success).toBe(false);
      expect(content.errors.length).toBe(1);
      expect(content.warnings?.length).toBe(2);
    });
  });

  describe('error context handling', () => {
    it('should handle errors with various context types', () => {
      const errorWithStringContext: Logger.Error = {
        code: 'STRING_CONTEXT',
        message: 'Error with string context',
        context: 'simple string'
      };

      const errorWithObjectContext: Logger.Error = {
        code: 'OBJECT_CONTEXT',
        message: 'Error with object context',
        context: { complex: { nested: 'value' }, array: [1, 2, 3] }
      };

      const errorWithNumberContext: Logger.Error = {
        code: 'NUMBER_CONTEXT',
        message: 'Error with number context',
        context: 42
      };

      session.logger.addError(errorWithStringContext);
      session.logger.addError(errorWithObjectContext);
      session.logger.addError(errorWithNumberContext);

      const result = session.getResult('test');
      
      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text as string);
      expect(content.errors).toHaveLength(3);
      
      // Check that all context types are preserved
      const errorCodes = content.errors.map((e: any) => e.code);
      expect(errorCodes).toContain('STRING_CONTEXT');
      expect(errorCodes).toContain('OBJECT_CONTEXT');
      expect(errorCodes).toContain('NUMBER_CONTEXT');
    });

    it('should handle errors without context', () => {
      const errorWithoutContext: Logger.Error = {
        code: 'NO_CONTEXT',
        message: 'Error without context'
        // no context field
      };

      session.logger.addError(errorWithoutContext);
      const result = session.getResult('test');

      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text as string);
      expect(content.errors).toHaveLength(1);
      expect(content.errors[0].code).toBe('NO_CONTEXT');
      expect(content.errors[0].message).toBe('Error without context');
    });
  });
}); 