import type { 
  Tool, 
  CallToolRequest, 
  CallToolResult,
  ListToolsRequest,
  ListToolsResult 
} from '@modelcontextprotocol/sdk/types.js';
import type { JSONSchema7 } from 'json-schema';

// Base project schema that will be merged with user schemas
export type ProjectSchema = {
  type: 'object';
  properties: {
    project: {
      type: 'string';
      description: 'Absolute path to the project directory';
    };
  };
  required: ['project'];
};

// Extended tool input schema that includes project parameter
export type ExtendedToolInputSchema = {
  type: 'object';
  properties: {
    project: {
      type: 'string';
      description: 'Absolute path to the project directory';
    };
  } & Record<string, JSONSchema7>;
  required: string[];
  additionalProperties?: boolean | JSONSchema7;
};

// Tool handler function type
export type ToolHandler = (request: CallToolRequest) => Promise<CallToolResult>;

// Tool registration type
export type ToolRegistration = {
  tool: Tool;
  handler: ToolHandler;
  originalSchema?: JSONSchema7;
};

// Extended tool type with project parameter
export type ExtendedTool = Omit<Tool, 'inputSchema'> & {
  inputSchema: ExtendedToolInputSchema;
};

// Utility type for merging schemas
export type SchemaWithProject<T extends JSONSchema7 = JSONSchema7> = T & {
  properties: T extends { properties: infer P } 
    ? P & ProjectSchema['properties']
    : ProjectSchema['properties'];
  required: T extends { required: infer R }
    ? R extends readonly string[]
      ? readonly [...R, 'project']
      : ['project']
    : ['project'];
};

// Tool validation result
export type ToolValidationResult = {
  isValid: boolean;
  errors: string[];
};

// Re-export MCP types for convenience
export type {
  Tool,
  CallToolRequest,
  CallToolResult,
  ListToolsRequest,
  ListToolsResult
};

// Re-export JSON Schema types
export type { JSONSchema7 }; 