import { Logger } from "../Logger/index.js";
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

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
  

}

export class McpSession {
  logger: Logger;

  constructor(_opts: McpSession.Opts = {}) {
    this.logger = new Logger();
  }

  throwError(criticalError: McpSession.Error): never {
    this.logger.addError(criticalError);
    const response = this.getResult({ criticalError });
    throw new McpInterruptError(response);
  }

  getResult<TData>(data: TData): CallToolResult {
    const { errors, warnings } = this.logger.getResponse();
    
    if (errors.length > 0) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            data,
            errors,
            ...(warnings.length > 0 && { warnings })
          }, null, 2)
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          data,
          ...(warnings.length > 0 && { warnings })
        }, null, 2)
      }],
      isError: false
    };
  }
} 