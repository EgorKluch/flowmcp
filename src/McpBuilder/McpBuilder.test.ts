import { McpBuilder, McpToolErrorCode } from './McpBuilder';
import { McpSession } from '../McpSession/index.js';
import type { Tool, CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

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

    const validHandler: McpBuilder.ToolHandler = async (session: McpSession): Promise<CallToolResult> => ({
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
      if (!result.success) {
        expect(result.errors[0].code).toBe(McpToolErrorCode.INVALID_TOOL_SCHEMA);
      }
    });

    it('should reject tool with invalid name pattern', () => {
      const invalidTool: Tool = {
        name: '123invalid',
        description: 'Invalid tool',
        inputSchema: { type: 'object' }
      };

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe(McpToolErrorCode.INVALID_TOOL_SCHEMA);
      }
    });

    it('should reject tool with empty description', () => {
      const invalidTool: Tool = {
        name: 'valid-name',
        description: '',
        inputSchema: { type: 'object' }
      };

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe(McpToolErrorCode.INVALID_TOOL_SCHEMA);
      }
    });

    it('should reject duplicate tool names', () => {
      builder.addTool(validTool, validHandler);
      const result = builder.addTool(validTool, validHandler);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe(McpToolErrorCode.TOOL_ALREADY_EXISTS);
      }
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

    it('should reject tool without inputSchema', () => {
      const invalidTool = {
        name: 'valid-name',
        description: 'Valid description'
        // missing inputSchema
      } as Tool;

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe(McpToolErrorCode.INVALID_TOOL_SCHEMA);
      }
    });

    it('should reject tool with non-object inputSchema', () => {
      const invalidTool = {
        name: 'valid-name',
        description: 'Valid description',
        inputSchema: 'not an object'
      } as unknown as Tool;

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe(McpToolErrorCode.INVALID_TOOL_SCHEMA);
      }
    });

    it('should reject tool with non-string name', () => {
      const invalidTool = {
        name: 123,
        description: 'Valid description',
        inputSchema: { type: 'object' }
      } as unknown as Tool;

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe(McpToolErrorCode.INVALID_TOOL_SCHEMA);
      }
    });

    it('should reject tool with non-string description', () => {
      const invalidTool = {
        name: 'valid-name',
        description: 123,
        inputSchema: { type: 'object' }
      } as unknown as Tool;

      const result = builder.addTool(invalidTool, validHandler);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe(McpToolErrorCode.INVALID_TOOL_SCHEMA);
      }
    });

    it('should handle addTool catch block when handler throws during registration', () => {
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
      if (!result.success) {
        expect(result.errors[0].code).toBe(McpToolErrorCode.TOOL_EXECUTION_ERROR);
      }
      
      // Restore original method
      (builder as any).extendToolWithProject = originalExtendTool;
    });

    it('should handle addTool catch block with non-Error thrown value', () => {
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
        expect(result.errors[0].code).toBe(McpToolErrorCode.TOOL_EXECUTION_ERROR);
        expect(result.errors[0].message).toContain('This is a string error, not an Error object');
      }
      
      // Restore original method
      (builder as any).extendToolWithProject = originalExtendTool;
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
      builder.addTool(testTool, async (session: McpSession) => ({
        content: [{ type: 'text', text: 'OK' }],
        isError: false
      }));
    });

    it('should reject missing project parameter', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;
      const session = new McpSession();

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: { input: 'test' }
        }
      };

      const result = await enhancedHandler?.(session, request);
      expect(result?.isError).toBe(true);
      const content = JSON.parse(result?.content[0].text as string);
      expect(content.success).toBe(false);
    });

    it('should reject relative paths', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;
      const session = new McpSession();

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

      const result = await enhancedHandler?.(session, request);
      expect(result?.isError).toBe(true);
      const content = JSON.parse(result?.content[0].text as string);
      expect(content.success).toBe(false);
    });

    it('should accept Unix absolute paths', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;
      const session = new McpSession();

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

      const result = await enhancedHandler?.(session, request);
      expect(result?.isError).toBe(false);
    });

    it('should accept Windows absolute paths', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;
      const session = new McpSession();

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

      const result = await enhancedHandler?.(session, request);
      expect(result?.isError).toBe(false);
    });

    it('should reject empty project parameter', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;
      const session = new McpSession();

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

      const result = await enhancedHandler?.(session, request);
      expect(result?.isError).toBe(true);
      const content = JSON.parse(result?.content[0].text as string);
      expect(content.success).toBe(false);
    });

    it('should reject non-string project parameter', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;
      const session = new McpSession();

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

      const result = await enhancedHandler?.(session, request);
      expect(result?.isError).toBe(true);
      const content = JSON.parse(result?.content[0].text as string);
      expect(content.success).toBe(false);
    });

    it('should handle missing arguments object', async () => {
      const registration = (builder as any).registeredTools.get('test-tool');
      const enhancedHandler = registration?.handler;
      const session = new McpSession();

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool'
          // missing arguments
        }
      };

      const result = await enhancedHandler?.(session, request);
      expect(result?.isError).toBe(true);
      const content = JSON.parse(result?.content[0].text as string);
      expect(content.success).toBe(false);
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

    it('should default additionalProperties to false when not specified', () => {
      const tool: Tool = {
        name: 'default-additional-props',
        description: 'Schema without additionalProperties',
        inputSchema: {
          type: 'object',
          properties: { input: { type: 'string' } }
          // no additionalProperties field
        }
      };

      const result = builder.addTool(tool, async () => ({
        content: [],
        isError: false
      }));

      expect(result.success).toBe(true);
      
      const registration = (builder as any).registeredTools.get('default-additional-props');
      const schema = registration?.tool.inputSchema;
      
      expect(schema.additionalProperties).toBe(false);
    });

    it('should preserve complex schema properties', () => {
      const tool: Tool = {
        name: 'complex-schema',
        description: 'Complex schema test',
        inputSchema: {
          type: 'object',
          properties: {
            complexProp: {
              type: 'object',
              properties: {
                nested: { type: 'string' }
              },
              required: ['nested']
            },
            arrayProp: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['complexProp']
        }
      };

      const result = builder.addTool(tool, async () => ({
        content: [],
        isError: false
      }));

      expect(result.success).toBe(true);
      
      const registration = (builder as any).registeredTools.get('complex-schema');
      const schema = registration?.tool.inputSchema;
      
      expect(schema.properties.project).toBeDefined();
      expect(schema.properties.complexProp).toBeDefined();
      expect(schema.properties.arrayProp).toBeDefined();
      expect(schema.required).toContain('project');
      expect(schema.required).toContain('complexProp');
    });
  });

  describe('applyToServer', () => {
    let mockServer: any;
    let requestHandlers: Map<any, any>;

    beforeEach(() => {
      requestHandlers = new Map();
      mockServer = {
        setRequestHandler: (schema: any, handler: any) => {
          requestHandlers.set(schema, handler);
        }
      };
    });

    it('should set up request handlers on server', () => {
      builder.applyToServer(mockServer);
      
      expect(requestHandlers.size).toBe(2);
      expect(requestHandlers.has(ListToolsRequestSchema)).toBe(true);
      expect(requestHandlers.has(CallToolRequestSchema)).toBe(true);
    });

    it('should handle ListTools request correctly', async () => {
      const testTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        inputSchema: { type: 'object', properties: { input: { type: 'string' } } }
      };

      builder.addTool(testTool, async () => ({ content: [], isError: false }));
      builder.applyToServer(mockServer);

      const listToolsHandler = requestHandlers.get(ListToolsRequestSchema);
      const result = await listToolsHandler({});
      
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('test-tool');
      expect(result.tools[0].inputSchema.properties.project).toBeDefined();
    });

    it('should handle CallTool request for existing tool', async () => {
      const testTool: Tool = {
        name: 'test-call-tool',
        description: 'Test call tool',
        inputSchema: { type: 'object', properties: { input: { type: 'string' } } }
      };

      builder.addTool(testTool, async () => ({ 
        content: [{ type: 'text', text: 'Tool executed' }], 
        isError: false 
      }));
      builder.applyToServer(mockServer);

      const callToolHandler = requestHandlers.get(CallToolRequestSchema);
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-call-tool',
          arguments: { 
            input: 'test input',
            project: '/absolute/path'
          }
        }
      };

      const result = await callToolHandler(request);
      
      expect(result.content[0]).toEqual({ type: 'text', text: 'Tool executed' });
      expect(result.isError).toBe(false);
    });

    it('should return error result for non-existent tool', async () => {
      builder.applyToServer(mockServer);

      const callToolHandler = requestHandlers.get(CallToolRequestSchema);
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'non-existent-tool',
          arguments: { project: '/path' }
        }
      };

      const result = await callToolHandler(request);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Tool \'non-existent-tool\' not found');
    });

    it('should handle tool execution errors', async () => {
      const failingTool: Tool = {
        name: 'failing-tool',
        description: 'Tool that throws generic error',
        inputSchema: { type: 'object', properties: {} }
      };

      builder.addTool(failingTool, async () => {
        throw new Error('Generic error from tool');
      });
      builder.applyToServer(mockServer);

      const callToolHandler = requestHandlers.get(CallToolRequestSchema);
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'failing-tool',
          arguments: { project: '/path' }
        }
      };

      const result = await callToolHandler(request);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error executing tool');
    });

    it('should handle tools that add errors to session', async () => {
      const errorTool: Tool = {
        name: 'error-tool',
        description: 'Tool that adds errors to session',
        inputSchema: { type: 'object', properties: {} }
      };

      builder.addTool(errorTool, async (session: McpSession) => {
        session.logger.addError({
          code: McpToolErrorCode.INVALID_PROJECT_PATH,
          message: 'Direct MCP error'
        });
        return session.getResult({});
      });
      builder.applyToServer(mockServer);

      const callToolHandler = requestHandlers.get(CallToolRequestSchema);
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'error-tool',
          arguments: { project: '/path' }
        }
      };

      const result = await callToolHandler(request);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Direct MCP error');
    });

    it('should handle non-Error exceptions', async () => {
      const nonErrorTool: Tool = {
        name: 'non-error-tool',
        description: 'Tool that throws non-Error value',
        inputSchema: { type: 'object', properties: {} }
      };

      builder.addTool(nonErrorTool, async () => {
        // eslint-disable-next-line no-throw-literal
        throw 123; // Throwing a number instead of Error
      });
      builder.applyToServer(mockServer);

      const callToolHandler = requestHandlers.get(CallToolRequestSchema);
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'non-error-tool',
          arguments: { project: '/path' }
        }
      };

      const result = await callToolHandler(request);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error executing tool \'non-error-tool\'');
      expect(result.content[0].text).toContain('123');
    });
  });

  // Additional tests for 100% coverage
  describe('private methods coverage', () => {
    it('should cover validateTool with accumulating errors', () => {
      const invalidTool = {
        name: null,
        description: null,
        inputSchema: null
      } as unknown as Tool;

      const result = builder.addTool(invalidTool, async () => ({ content: [], isError: false }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(1); // Multiple validation errors
      }
    });

    it('should cover extendToolWithProject with complex schemas', () => {
      const tool: Tool = {
        name: 'complex-extension-test',
        description: 'Test complex schema extension',
        inputSchema: {
          type: 'object',
          properties: {
            nested: {
              type: 'object',
              properties: {
                deep: { type: 'string' }
              }
            }
          },
          required: ['nested'],
          additionalProperties: { type: 'string' }
        }
      };

      const result = builder.addTool(tool, async () => ({ content: [], isError: false }));
      expect(result.success).toBe(true);
      
      const registration = (builder as any).registeredTools.get('complex-extension-test');
      const schema = registration?.tool.inputSchema;
      
      expect(schema.properties.project).toBeDefined();
      expect(schema.properties.nested).toBeDefined();
      expect(schema.required).toContain('project');
      expect(schema.required).toContain('nested');
      expect(typeof schema.additionalProperties).toBe('object');
    });

    it('should cover createEnhancedHandler with various path formats', async () => {
      const tool: Tool = {
        name: 'path-test-tool',
        description: 'Test path validation',
        inputSchema: { type: 'object', properties: {} }
      };

      builder.addTool(tool, async () => ({ content: [{ type: 'text', text: 'OK' }], isError: false }));
      
      const registration = (builder as any).registeredTools.get('path-test-tool');
      const enhancedHandler = registration?.handler;
      const session = new McpSession();

      // Test Windows path with forward slashes
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'path-test-tool',
          arguments: { project: 'C:/Windows/Path' }
        }
      };

      const result = await enhancedHandler?.(session, request);
      expect(result?.isError).toBe(false);
    });

    it('should cover all validation edge cases', () => {
      // Test tool with valid name but failing other validations
      const edgeTool = {
        name: 'validName123',
        description: undefined,
        inputSchema: undefined
      } as unknown as Tool;

      const result = builder.addTool(edgeTool, async () => ({ content: [], isError: false }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should cover schema extension with undefined properties and required', () => {
      const tool: Tool = {
        name: 'minimal-schema-test',
        description: 'Test minimal schema',
        inputSchema: {
          type: 'object'
          // No properties, no required, no additionalProperties
        }
      };

      const result = builder.addTool(tool, async () => ({ content: [], isError: false }));
      expect(result.success).toBe(true);
      
      const registration = (builder as any).registeredTools.get('minimal-schema-test');
      const schema = registration?.tool.inputSchema;
      
      expect(schema.properties.project).toBeDefined();
      expect(schema.required).toEqual(['project']); // Should only contain project
      expect(schema.additionalProperties).toBe(false); // Should default to false
    });
  });
}); 