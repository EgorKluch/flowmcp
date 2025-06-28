import { Logger } from "../Logger/index.js";

export class McpInterruptError extends Error {
  public readonly isMcpInterrupt = true;
  
  constructor(public readonly response: any) {
    super('MCP request interrupted');
    this.name = 'McpInterruptError';
  }
}

export declare namespace McpSession {
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
    warnings?: McpSession.Warning[];
  };
  
  type ErrorResponse<TData> = {
    success: false;
    data: TData;
    errors: McpSession.Error[];
    warnings?: McpSession.Warning[];
  };
  
  type Response<TData> = SuccessResponse<TData> | ErrorResponse<TData>;
}

export class McpSession {
  logger: Logger;

  constructor(_opts: McpSession.Opts = {}) {
    this.logger = new Logger();
  }

  throwError(criticalError: McpSession.Error): never {
    this.logger.addError(criticalError);
    const response = this.getResponse({ criticalError });
    throw new McpInterruptError(response);
  }

  getResponse<TData>(data: TData): McpSession.Response<TData> {
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