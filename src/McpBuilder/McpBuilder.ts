import { Logger } from "../Logger/index.js";
import { McpSession, McpInterruptError } from "../McpSession/index.js";
import type {
  Tool,
  CallToolRequest,
  CallToolResult,
  ListToolsRequest,
  ListToolsResult
} from '@modelcontextprotocol/sdk/types.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Minimal JSON Schema types needed for our use case
type JSONSchemaType = 'object' | 'string' | 'number' | 'boolean' | 'array' | 'null';

type JSONSchemaProperty = {
  type?: JSONSchemaType | JSONSchemaType[];
  description?: string;
  enum?: any[];
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchemaProperty;
  required?: string[];
  additionalProperties?: boolean | JSONSchemaProperty;
  [key: string]: any;
};

type JSONSchema = JSONSchemaProperty;

// MCP Tool related error codes
export enum McpToolErrorCode {
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_ALREADY_EXISTS = 'TOOL_ALREADY_EXISTS',
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',
  INVALID_TOOL_SCHEMA = 'INVALID_TOOL_SCHEMA',
  MISSING_PROJECT_PARAMETER = 'MISSING_PROJECT_PARAMETER',
  INVALID_PROJECT_PATH = 'INVALID_PROJECT_PATH',
}

export declare namespace McpBuilder {
  type Opts = {};
  
  type Error = {
    message?: string;
    code: string;
    context?: unknown;
  };
  
  type Warning = {
    message?: string;
    code: string;
    context?: unknown;
  };
  
  type SuccessResponse<TData> = {
    success: true;
    data: TData;
    warnings?: McpBuilder.Warning[];
  };
  
  type ErrorResponse<TData> = {
    success: false;
    data: TData;
    errors: McpBuilder.Error[];
    warnings?: McpBuilder.Warning[];
  };
  
  type Response<TData> = SuccessResponse<TData> | ErrorResponse<TData>;

  // Tool-related types moved from tools.ts
  type ProjectSchema = {
    type: 'object';
    properties: {
      project: {
        type: 'string';
        description: 'Absolute path to the project directory';
      };
    };
    required: ['project'];
  };

  type ExtendedToolInputSchema = {
    type: 'object';
    properties: {
      project: {
        type: 'string';
        description: 'Absolute path to the project directory';
      };
    } & Record<string, JSONSchema>;
    required: string[];
    additionalProperties?: boolean | JSONSchema;
  };

  type ToolHandler = (session: McpSession, request: CallToolRequest) => Promise<CallToolResult>;

  type ToolRegistration = {
    tool: Tool;
    handler: ToolHandler;
    originalSchema?: JSONSchema;
  };

  type ExtendedTool = Omit<Tool, 'inputSchema'> & {
    inputSchema: ExtendedToolInputSchema;
  };

  type SchemaWithProject<T extends JSONSchema = JSONSchema> = T & {
    properties: T extends { properties: infer P } 
      ? P & ProjectSchema['properties']
      : ProjectSchema['properties'];
    required: T extends { required: infer R }
      ? R extends readonly string[]
        ? readonly [...R, 'project']
        : ['project']
      : ['project'];
  };

  type ToolValidationResult = {
    isValid: boolean;
    errors: string[];
  };
}

export class McpBuilder {
  logger: Logger;
  private registeredTools: Map<string, McpBuilder.ToolRegistration> = new Map();

  constructor(_opts: McpBuilder.Opts = {}) {
    this.logger = new Logger();
  }
  
  /**
   * Add a new MCP tool with automatic schema extension for project parameter
   * @param tool - The tool definition with user's input schema
   * @param handler - Function to handle tool execution
   */
  addTool(tool: Tool, handler: McpBuilder.ToolHandler): McpBuilder.Response<void> {
    try {
      // Validate tool
      if (!this.validateTool(tool)) {
        return this.getResponse(undefined);
      }

      // Check if tool already exists
      if (this.registeredTools.has(tool.name)) {
        this.logger.addError({
          code: McpToolErrorCode.TOOL_ALREADY_EXISTS,
          message: `Tool '${tool.name}' already exists`,
          context: {}
        });
        return this.getResponse(undefined);
      }

      // Extend user's schema with project parameter
      const extendedTool = this.extendToolWithProject(tool);
      
      // Create enhanced handler that validates project parameter
      const enhancedHandler = this.createEnhancedHandler(handler);

      // Register the tool
      this.registeredTools.set(tool.name, {
        tool: extendedTool as unknown as Tool,
        handler: enhancedHandler,
        originalSchema: tool.inputSchema as JSONSchema
      });

      return this.getResponse(undefined);
    } catch (error) {
      this.logger.addError({
        code: McpToolErrorCode.TOOL_EXECUTION_ERROR,
        message: `Failed to add tool '${tool.name}': ${error instanceof Error ? error.message : String(error)}`,
        context: { error }
      });
      return this.getResponse(undefined);
    }
  }
  
  /**
   * Extend user's tool schema with required project parameter
   */
  private extendToolWithProject(tool: Tool): McpBuilder.ExtendedTool {
    const inputSchema = tool.inputSchema as JSONSchema;
    
    // Create base project schema
    const projectSchema: McpBuilder.ProjectSchema = {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Absolute path to the project directory'
        }
      },
      required: ['project']
    };

    // Merge schemas
    const extendedSchema: McpBuilder.ExtendedToolInputSchema = {
      type: 'object',
      properties: {
        ...projectSchema.properties,
        ...(inputSchema?.properties || {})
      },
      required: [
        ...projectSchema.required,
        ...(inputSchema?.required || [])
      ],
      additionalProperties: inputSchema?.additionalProperties ?? false
    };

    return {
      ...tool,
      inputSchema: extendedSchema
    };
  }

  /**
   * Create enhanced handler that validates project parameter
   */
  private createEnhancedHandler(originalHandler: McpBuilder.ToolHandler): McpBuilder.ToolHandler {
    return async (session: McpSession, request: CallToolRequest): Promise<CallToolResult> => {
      const args = request.params.arguments || {};
      
      // Validate project parameter
      if (!args.project || typeof args.project !== 'string') {
        session.throwError({
          code: McpToolErrorCode.MISSING_PROJECT_PARAMETER,
          message: 'Project parameter is required and must be a non-empty string',
          context: { providedArgs: args }
        });
      }

      // Basic validation that project is an absolute path
      if (!args.project.startsWith('/') && !args.project.match(/^[A-Za-z]:[\\\/]/)) {
        session.throwError({
          code: McpToolErrorCode.INVALID_PROJECT_PATH,
          message: 'Project parameter must be an absolute path',
          context: { providedProject: args.project }
        });
      }

      // Call original handler with validated arguments
      return await originalHandler(session, request);
    };
  }

  /**
   * Validate tool definition
   */
  private validateTool(tool: Tool): boolean {
    if (!tool.name || typeof tool.name !== 'string') {
      this.logger.addError({
        code: McpToolErrorCode.INVALID_TOOL_SCHEMA,
        message: `Tool name is required and must be a string`,
        context: { tool }
      });
    }

    if (!tool.description || typeof tool.description !== 'string') {
      this.logger.addError({
        code: McpToolErrorCode.INVALID_TOOL_SCHEMA,
        message: `Tool description is required and must be a string`,
        context: { tool }
      });
    }

    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      this.logger.addError({
        code: McpToolErrorCode.INVALID_TOOL_SCHEMA,
        message: `Tool inputSchema is required and must be an object`,
        context: { tool }
      });
    }

    // Check if tool name contains only valid characters
    if (tool.name && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tool.name)) {
      this.logger.addError({
        code: McpToolErrorCode.INVALID_TOOL_SCHEMA,
        message: `Tool name must start with a letter and contain only letters, numbers, underscores, and hyphens`,
        context: { tool }
      });
    }

    const { errors } = this.logger.getResponse();
    return errors.length === 0;
  }

  /**
   * Apply registered tools to MCP Server by setting up request handlers
   * @param server - MCP Server instance
   */
  applyToServer(server: Server): void {
    // Set up ListTools handler
    server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest): Promise<ListToolsResult> => {
      const tools: Tool[] = [];
      
      for (const registration of this.registeredTools.values()) {
        tools.push(registration.tool);
      }
      
      return { tools };
    });

    // Set up CallTool handler
    server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
      const session = new McpSession();
      const toolName = request.params.name;
      
      try {
        const registration = this.registeredTools.get(toolName);
        
        if (!registration) {
          return session.throwError({
            code: McpToolErrorCode.TOOL_NOT_FOUND,
            message: `Tool '${toolName}' not found`,
            context: { availableTools: Array.from(this.registeredTools.keys()) }
          });
        }
        
        return await registration.handler(session, request);
      } catch (error) {
        // Handle McpInterruptError properly - the response is already a CallToolResult
        if (error instanceof McpInterruptError) {
          return error.response;
        }
        
        // Handle other errors through session
        session.logger.addError({
          code: McpToolErrorCode.TOOL_EXECUTION_ERROR,
          message: `Error executing tool '${toolName}': ${error instanceof Error ? error.message : String(error)}`,
        });
        
        return session.getResult({});
      }
    });
  }
  
  getResponse<TData>(data: TData): McpBuilder.Response<TData> {
    const { errors, warnings } = this.logger.getResponse();
    
    if (errors.length > 0) {
      return {
        success: false,
        data,
        errors,
        ...(warnings.length > 0 && { warnings })
      };
    }
    
    return {
      success: true,
      data,
      ...(warnings.length > 0 && { warnings })
    };
  }
} 
