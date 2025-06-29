import { Logger } from "../Logger/index.js";
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export declare namespace McpSession {
  type Opts = {};
}

export class McpSession {
  logger: Logger;

  constructor(_opts: McpSession.Opts = {}) {
    this.logger = new Logger();
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