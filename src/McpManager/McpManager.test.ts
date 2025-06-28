import { McpManager } from './McpManager.js';
import { McpToolErrorCode } from '../types/errors.js';
import type { Tool, CallToolRequest } from './types/tools.js';

describe('McpManager Tool Management', () => {
  let manager: McpManager<any, any>;

  beforeEach(() => {
    manager = new McpManager();
  });

  describe('addTool', () => {
    const sampleTool: Tool = {
      name: 'test_tool',
      description: 'A test tool for demonstration',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Message to process'
          }
        },
        required: ['message'],
        additionalProperties: false
      }
    };

    const sampleHandler = async (request: CallToolRequest) => {
      const args = request.params.arguments || {};
      return {
        isError: false,
        content: [
          {
            type: 'text' as const,
            text: `Processed: ${args.message} in project: ${args.project}`
          }
        ]
      };
    };

    it('should successfully add a tool with extended schema', () => {
      const response = manager.addTool(sampleTool, sampleHandler);
      
      expect(response.success).toBe(true);
    });

    it('should prevent adding duplicate tools', () => {
      // Add tool first time
      const firstResponse = manager.addTool(sampleTool, sampleHandler);
      expect(firstResponse.success).toBe(true);
      
      // Try to add same tool again
      const secondResponse = manager.addTool(sampleTool, sampleHandler);
      expect(secondResponse.success).toBe(false);
      if (!secondResponse.success) {
        expect(secondResponse.errors).toBeDefined();
        expect(secondResponse.errors[0].code).toBe(McpToolErrorCode.TOOL_ALREADY_EXISTS);
      }
    });

    it('should validate tool schema', () => {
      const invalidTool = {
        name: '', // Invalid: empty name
        description: 'Test tool',
        inputSchema: null // Invalid: null schema
      } as any;
      
      const response = manager.addTool(invalidTool, sampleHandler);
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.errors[0].code).toBe(McpToolErrorCode.INVALID_TOOL_SCHEMA);
      }
    });

    it('should validate tool name format', () => {
      const invalidTool: Tool = {
        name: '123invalid', // Invalid: starts with number
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      };
      
      const response = manager.addTool(invalidTool, sampleHandler);
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.errors[0].code).toBe(McpToolErrorCode.INVALID_TOOL_SCHEMA);
      }
    });

    it('should handle exception in addTool method', () => {
      const problematicTool: Tool = {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      };

      // Create a handler that will throw an error during the process
      const problematicHandler = () => {
        throw new Error('Handler creation failed');
      };

      // Mock extendToolWithProject to throw an error
      const originalExtend = (manager as any).extendToolWithProject;
      (manager as any).extendToolWithProject = () => {
        throw new Error('Schema extension failed');
      };

      const response = manager.addTool(problematicTool, problematicHandler);
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.errors[0].code).toBe(McpToolErrorCode.TOOL_EXECUTION_ERROR);
        expect(response.errors[0].message).toContain('Failed to add tool');
      }

      // Restore original method
      (manager as any).extendToolWithProject = originalExtend;
    });

    it('should test enhanced handler project validation', async () => {
      const testTool: Tool = {
        name: 'validation_test_tool',
        description: 'Tool for testing project validation',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'string' }
          },
          required: ['data']
        }
      };

      const testHandler = async (request: CallToolRequest) => {
        return {
          isError: false,
          content: [{ type: 'text' as const, text: 'Success' }]
        };
      };

      // Add the tool
      const addResponse = manager.addTool(testTool, testHandler);
      expect(addResponse.success).toBe(true);

      // Get the enhanced handler to test it directly
      const registration = (manager as any).registeredTools.get('validation_test_tool');
      const enhancedHandler = registration.handler;

      // Test missing project parameter
      const requestWithoutProject = {
        method: 'tools/call',
        params: {
          name: 'validation_test_tool',
          arguments: {
            data: 'test data'
            // Missing project parameter
          }
        }
      };

      await expect(enhancedHandler(requestWithoutProject)).rejects.toThrow('Project parameter is required');

      // Test invalid project path (relative path)
      const requestWithInvalidProject = {
        method: 'tools/call',
        params: {
          name: 'validation_test_tool',
          arguments: {
            project: 'relative/path', // Invalid: not absolute
            data: 'test data'
          }
        }
      };

      await expect(enhancedHandler(requestWithInvalidProject)).rejects.toThrow('Project parameter must be an absolute path');

      // Test valid project path (Unix style)
      const requestWithValidUnixProject = {
        method: 'tools/call',
        params: {
          name: 'validation_test_tool',
          arguments: {
            project: '/absolute/unix/path',
            data: 'test data'
          }
        }
      };

      const unixResult = await enhancedHandler(requestWithValidUnixProject);
      expect(unixResult.content[0]).toHaveProperty('text', 'Success');

      // Test valid project path (Windows style)  
      const requestWithValidWindowsProject = {
        method: 'tools/call',
        params: {
          name: 'validation_test_tool',
          arguments: {
            project: 'C:\\absolute\\windows\\path',
            data: 'test data'
          }
        }
      };

      const windowsResult = await enhancedHandler(requestWithValidWindowsProject);
      expect(windowsResult.content[0]).toHaveProperty('text', 'Success');
    });
  });
}); 
