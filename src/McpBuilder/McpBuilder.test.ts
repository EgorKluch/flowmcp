import { McpBuilder, McpToolError, McpToolErrorCode } from './McpBuilder';
import type { Tool, ToolHandler, CallToolRequest, CallToolResult } from './types/tools';

describe('McpBuilder', () => {
  let builder: McpBuilder;

  beforeEach(() => {
    builder = new McpBuilder();
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(builder.logger).toBeDefined();
    });
  });

  describe('addTool', () => {
    const validTool: Tool = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string' }
        },
        required: ['input']
      }
    };

    const validHandler: ToolHandler = async (): Promise<CallToolResult> => ({
      content: [{ type: 'text', text: 'Success' }],
      isError: false
    });

    it('should add valid tool successfully', () => {
      const result = builder.addTool(validTool, validHandler);
      expect(result.success).toBe(true);
    });

    it('should reject tool with empty name', () => {
      const invalidTool: Tool = {
        name: '',
        description: 'Invalid tool',
        inputSchema: { type: 'object' }
      };

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
    });

    it('should reject tool with invalid name pattern', () => {
      const invalidTool: Tool = {
        name: '123invalid',
        description: 'Invalid tool',
        inputSchema: { type: 'object' }
      };

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
    });

    it('should reject tool with empty description', () => {
      const invalidTool: Tool = {
        name: 'valid-name',
        description: '',
        inputSchema: { type: 'object' }
      };

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
    });

    it('should reject duplicate tool names', () => {
      builder.addTool(validTool, validHandler);
      const result = builder.addTool(validTool, validHandler);
      expect(result.success).toBe(false);
    });

    it('should handle valid tool names with special characters', () => {
      const tool: Tool = {
        name: 'valid-tool_name123',
        description: 'Valid tool',
        inputSchema: { type: 'object' }
      };

      const result = builder.addTool(tool, validHandler);
      expect(result.success).toBe(true);
    });

    it('should handle addTool catch block when handler throws during registration', () => {
      // Create a mock tool that will cause an exception during processing
      const problematicTool = {
        name: 'problem-tool',
        description: 'Tool that causes issues',
        inputSchema: { type: 'object' }
      } as Tool;

      // Mock the private method to throw an error
      const originalExtendTool = (builder as any).extendToolWithProject;
      (builder as any).extendToolWithProject = () => {
        throw new Error('Simulated processing error');
      };

      const result = builder.addTool(problematicTool, validHandler);
      
      expect(result.success).toBe(false);
      
      // Restore original method
      (builder as any).extendToolWithProject = originalExtendTool;
    });

    it('should handle addTool catch block with non-Error thrown value', () => {
      // Create a mock tool that will cause an exception during processing
      const problematicTool = {
        name: 'problem-tool-2',
        description: 'Tool that causes non-Error issues',
        inputSchema: { type: 'object' }
      } as Tool;

      // Mock the private method to throw a non-Error value
      const originalExtendTool = (builder as any).extendToolWithProject;
      (builder as any).extendToolWithProject = () => {
        // eslint-disable-next-line no-throw-literal
        throw 'This is a string error, not an Error object';
      };

      const result = builder.addTool(problematicTool, validHandler);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].message).toContain('This is a string error, not an Error object');
      }
      
      // Restore original method
      (builder as any).extendToolWithProject = originalExtendTool;
    });

    it('should reject tool without inputSchema', () => {
      const invalidTool = {
        name: 'valid-name',
        description: 'Valid description'
        // missing inputSchema
      } as Tool;

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
    });

    it('should reject tool with non-object inputSchema', () => {
      const invalidTool = {
        name: 'valid-name',
        description: 'Valid description',
        inputSchema: 'not an object'
      } as unknown as Tool;

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
    });

    it('should reject tool with non-string name', () => {
      const invalidTool = {
        name: 123,
        description: 'Valid description',
        inputSchema: { type: 'object' }
      } as unknown as Tool;

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
    });

    it('should reject tool with non-string description', () => {
      const invalidTool = {
        name: 'valid-name',
        description: 123,
        inputSchema: { type: 'object' }
      } as unknown as Tool;

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
    });
  });

  describe('enhanced handler validation', () => {
    const testTool: Tool = {
      name: 'test-tool',
      description: 'Test tool',
      inputSchema: {
        type: 'object',
        properties: { input: { type: 'string' } }
      }
    };

    beforeEach(() => {
      builder.addTool(testTool, async () => ({
        content: [{ type: 'text', text: 'OK' }],
        isError: false
      }));
    });

    it('should reject missing project parameter', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: { input: 'test' }
        }
      };

      await expect(enhancedHandler?.(request)).rejects.toThrow(McpToolError);
    });

    it('should reject relative paths', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: {
            input: 'test',
            project: './relative'
          }
        }
      };

      await expect(enhancedHandler?.(request)).rejects.toThrow(McpToolError);
    });

    it('should accept Unix absolute paths', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: {
            input: 'test',
            project: '/absolute/path'
          }
        }
      };

      const result = await enhancedHandler?.(request);
      expect(result?.isError).toBe(false);
    });

    it('should accept Windows absolute paths', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: {
            input: 'test',
            project: 'C:\\Windows\\Path'
          }
        }
      };

      const result = await enhancedHandler?.(request);
      expect(result?.isError).toBe(false);
    });

    it('should reject empty project parameter', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: {
            input: 'test',
            project: ''
          }
        }
      };

      await expect(enhancedHandler?.(request)).rejects.toThrow(McpToolError);
    });

    it('should reject non-string project parameter', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: {
            input: 'test',
            project: 123
          }
        }
      };

      await expect(enhancedHandler?.(request)).rejects.toThrow(McpToolError);
    });

    it('should handle missing arguments object', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool'
          // missing arguments
        }
      };

      await expect(enhancedHandler?.(request)).rejects.toThrow(McpToolError);
    });
  });

  describe('getResponse', () => {
    it('should return success when no errors', () => {
      const result = builder.getResponse('test');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
    });

    it('should return error when errors exist', () => {
      builder.logger.addError({ code: 'TEST', message: 'Error' });
      const result = builder.getResponse('test');
      expect(result.success).toBe(false);
    });

    it('should include warnings in success response', () => {
      builder.logger.addWarning({ code: 'WARN', message: 'Warning' });
      const result = builder.getResponse('test');
      
      expect(result.success).toBe(true);
      expect(result.warnings?.length).toBe(1);
    });

    it('should include warnings in error response', () => {
      builder.logger.addError({ code: 'ERROR', message: 'Error' });
      builder.logger.addWarning({ code: 'WARN', message: 'Warning' });
      const result = builder.getResponse('test');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.warnings?.length).toBe(1);
      }
    });

    it('should return success response without warnings when no warnings exist', () => {
      const result = builder.getResponse('test');
      
      expect(result.success).toBe(true);
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('schema extension', () => {
    it('should extend schema with project parameter', () => {
      const tool: Tool = {
        name: 'schema-test',
        description: 'Schema test',
        inputSchema: {
          type: 'object',
          properties: { input: { type: 'string' } },
          required: ['input']
        }
      };

      const result = builder.addTool(tool, async () => ({
        content: [],
        isError: false
      }));

      expect(result.success).toBe(true);
      
      const registration = (builder as any).registeredTools.get('schema-test');
      const schema = registration?.tool.inputSchema;
      
      expect(schema.properties.project).toBeDefined();
      expect(schema.required).toContain('project');
      expect(schema.required).toContain('input');
    });

    it('should handle schema without existing required fields', () => {
      const tool: Tool = {
        name: 'no-required-test',
        description: 'Schema without required fields',
        inputSchema: {
          type: 'object',
          properties: { input: { type: 'string' } }
          // no required field
        }
      };

      const result = builder.addTool(tool, async () => ({
        content: [],
        isError: false
      }));

      expect(result.success).toBe(true);
      
      const registration = (builder as any).registeredTools.get('no-required-test');
      const schema = registration?.tool.inputSchema;
      
      expect(schema.required).toContain('project');
    });

    it('should handle schema without existing properties', () => {
      const tool: Tool = {
        name: 'no-props-test',
        description: 'Schema without properties',
        inputSchema: {
          type: 'object'
          // no properties field
        }
      };

      const result = builder.addTool(tool, async () => ({
        content: [],
        isError: false
      }));

      expect(result.success).toBe(true);
      
      const registration = (builder as any).registeredTools.get('no-props-test');
      const schema = registration?.tool.inputSchema;
      
      expect(schema.properties.project).toBeDefined();
    });

    it('should preserve additionalProperties setting', () => {
      const tool: Tool = {
        name: 'additional-props-test',
        description: 'Schema with additionalProperties',
        inputSchema: {
          type: 'object',
          properties: { input: { type: 'string' } },
          additionalProperties: true
        }
      };

      const result = builder.addTool(tool, async () => ({
        content: [],
        isError: false
      }));

      expect(result.success).toBe(true);
      
      const registration = (builder as any).registeredTools.get('additional-props-test');
      const schema = registration?.tool.inputSchema;
      
      expect(schema.additionalProperties).toBe(true);
    });
  });
}); 