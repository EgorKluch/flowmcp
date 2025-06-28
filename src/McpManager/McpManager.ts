import {Logger} from "../Logger/index.js";
import {McpError, McpToolError, McpToolErrorCode} from "../types/errors.js";
import {McpWarning} from "../types/McpWarning.js";
import type {
  Tool,
  CallToolRequest,
  CallToolResult,
  ToolRegistration,
  ToolHandler,
  ExtendedTool,
  ExtendedToolInputSchema,
  ToolValidationResult,
  ProjectSchema,
  JSONSchema7
} from "./types/tools.js";

export declare namespace McpManager {
  type Opts = {};
  
  type Error = {
    message: string;
    code: string;
    context?: unknown;
  };
  
  type Warning = {
    message: string;
    code: string;
    context?: unknown;
  };
  
  type SuccessResponse<TData> = {
    success: true;
    data: TData;
    warnings?: McpManager.Warning[];
  };
  
  type ErrorResponse<TData> = {
    success: false;
    data: TData;
    errors: McpManager.Error[];
    warnings?: McpManager.Warning[];
  };
  
  type Response<TData> = SuccessResponse<TData> | ErrorResponse<TData>;
}

export class McpManager<TError extends McpError, TWarning extends McpWarning> {
  logger: Logger<TError, TWarning>;
  private registeredTools: Map<string, ToolRegistration> = new Map();

  constructor(_opts: McpManager.Opts = {}) {
    this.logger = new Logger({ manager: this });
  }
  
  /**
   * Add a new MCP tool with automatic schema extension for project parameter
   * @param tool - The tool definition with user's input schema
   * @param handler - Function to handle tool execution
   */
  addTool(tool: Tool, handler: ToolHandler): McpManager.Response<void> {
    try {
      // Validate tool
      const validation = this.validateTool(tool);
      if (!validation.isValid) {
        this.logger.addError({
          code: McpToolErrorCode.INVALID_TOOL_SCHEMA,
          message: `Invalid tool schema for '${tool.name}'`,
          context: { errors: validation.errors }
        } as TError);
        return this.getResponse(undefined);
      }

      // Check if tool already exists
      if (this.registeredTools.has(tool.name)) {
        this.logger.addError({
          code: McpToolErrorCode.TOOL_ALREADY_EXISTS,
          message: `Tool '${tool.name}' already exists`,
          context: {}
        } as TError);
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
        originalSchema: tool.inputSchema as JSONSchema7
      });

      return this.getResponse(undefined);
    } catch (error) {
      this.logger.addError({
        code: McpToolErrorCode.TOOL_EXECUTION_ERROR,
        message: `Failed to add tool '${tool.name}': ${error instanceof Error ? error.message : String(error)}`,
        context: { error }
      } as TError);
      return this.getResponse(undefined);
    }
  }
  
  /**
   * Extend user's tool schema with required project parameter
   */
  private extendToolWithProject(tool: Tool): ExtendedTool {
    const inputSchema = tool.inputSchema as JSONSchema7;
    
    // Create base project schema
    const projectSchema: ProjectSchema = {
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
    const extendedSchema: ExtendedToolInputSchema = {
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
  private createEnhancedHandler(originalHandler: ToolHandler): ToolHandler {
    return async (request: CallToolRequest): Promise<CallToolResult> => {
      const args = request.params.arguments || {};
      
      // Validate project parameter
      if (!args.project || typeof args.project !== 'string') {
        throw new McpToolError(
          McpToolErrorCode.MISSING_PROJECT_PARAMETER,
          'Project parameter is required and must be a non-empty string',
          { providedArgs: args }
        );
      }

      // Basic validation that project is an absolute path
      if (!args.project.startsWith('/') && !args.project.match(/^[A-Za-z]:[\\\/]/)) {
        throw new McpToolError(
          McpToolErrorCode.INVALID_PROJECT_PATH,
          'Project parameter must be an absolute path',
          { providedProject: args.project }
        );
      }

      // Call original handler with validated arguments
      return await originalHandler(request);
    };
  }

  /**
   * Validate tool definition
   */
  private validateTool(tool: Tool): ToolValidationResult {
    const errors: string[] = [];

    if (!tool.name || typeof tool.name !== 'string') {
      errors.push('Tool name is required and must be a string');
    }

    if (!tool.description || typeof tool.description !== 'string') {
      errors.push('Tool description is required and must be a string');
    }

    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      errors.push('Tool inputSchema is required and must be an object');
    }

    // Check if tool name contains only valid characters
    if (tool.name && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tool.name)) {
      errors.push('Tool name must start with a letter and contain only letters, numbers, underscores, and hyphens');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  getResponse<TData>(data: TData): McpManager.Response<TData> {
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
