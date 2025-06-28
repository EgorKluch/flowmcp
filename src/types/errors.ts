export type McpError = {
  code: string,
  message: string,
  context?: unknown,
};

export class McpInterruptError extends Error {
  public readonly isMcpInterrupt = true;
  
  constructor(public readonly response: any) {
    super('MCP request interrupted');
    this.name = 'McpInterruptError';
  }
}

// New MCP Tool related error types
export enum McpToolErrorCode {
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_ALREADY_EXISTS = 'TOOL_ALREADY_EXISTS',
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',
  INVALID_TOOL_SCHEMA = 'INVALID_TOOL_SCHEMA',
  MISSING_PROJECT_PARAMETER = 'MISSING_PROJECT_PARAMETER',
  INVALID_PROJECT_PATH = 'INVALID_PROJECT_PATH',
}

export class McpToolError extends Error {
  constructor(
    public readonly code: McpToolErrorCode,
    message: string,
    public readonly context?: unknown
  ) {
    super(message);
    this.name = 'McpToolError';
  }
}
