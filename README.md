# FlowMCP

Powerful toolkit for building MCP (Model Context Protocol) tools with automatic validation, error handling, and project path management.

## Installation

```bash
npm install flowmcp
```

## Key Features

- **Tool Building** - Create MCP tools with automatic schema validation  
- **Project Path Management** - Automatic project parameter injection and validation
- **Session Handling** - Manage MCP request sessions with error handling
- **Independent Logger** - Standalone error/warning collection with frequency analysis
- **TypeScript Support** - Full type safety and IntelliSense support

## Basic Usage

### Build MCP Tools

```typescript
import { McpBuilder } from 'flowmcp';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const builder = new McpBuilder();

// Register a tool - project parameter added automatically
const result = builder.addTool({
  name: 'read_file',
  description: 'Read a file from the project',
  inputSchema: {
    type: 'object',
    properties: {
      filename: { type: 'string' }
    },
    required: ['filename']
  }
}, async (session, request) => {
  const { project, filename } = request.params.arguments;
  // project is validated as absolute path
  
  try {
    const content = await readFile(path.join(project, filename));
    return session.getResult({ content, filename });
  } catch (error) {
    session.logger.addError({
      code: 'FILE_READ_ERROR',
      context: { project, filename, error: error.message }
    });
    
    return session.getResult({ error: 'File not found' });
  }
});

// Apply tools to MCP server
const server = new Server({ name: 'file-server', version: '1.0.0' });
builder.applyToServer(server);
```

### Handle MCP Sessions

```typescript
import { McpSession } from 'flowmcp';

// Create session per request
function handleRequest(requestData) {
  const session = new McpSession();
  
  // Use throwError for critical failures that should stop execution
  if (requestData.invalid) {
    session.throwError({
      code: 'INVALID_REQUEST_DATA',
      context: { invalidFields: requestData.getInvalidFields() }
    });
    // This line never executes - throwError stops execution
  }
  
  // Generate responses
  return session.getResult({ data: 'result' });
}
```

### Independent Error Logging

```typescript
import { Logger } from 'flowmcp';

// Logger can be used independently of sessions
const logger = new Logger();

// Collect and group errors (by code)
logger.addError({ code: 'VALIDATION_ERROR', context: { field: 'email', format: 'invalid' } });
logger.addWarning({ code: 'DEPRECATED_API', context: { endpoint: '/old-api', replacement: '/v2/api' } });

// Get prioritized summary
const { errors, warnings } = logger.getResponse();
```

## Integration

Complete MCP server integration:

```typescript
import { McpBuilder } from 'flowmcp';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const builder = new McpBuilder();
const server = new Server({ name: 'my-mcp-server', version: '1.0.0' });

// Register tools
builder.addTool({
  name: 'process_data',
  description: 'Process project data',
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'string' }
    }
  }
}, async (session, request) => {
  const { project, data } = request.params.arguments;
  
  try {
    const result = await processData(project, data);
    return session.getResult({ result });
  } catch (error) {
    session.logger.addError({ 
      code: 'PROCESSING_ERROR',
      context: { project, data, error: error.message }
    });
    
    return session.getResult({ error: error.message });
  }
});

// Apply all registered tools to the server
builder.applyToServer(server);

// Start the server
server.connect(transport);
```

## Good Practices

### Error Handling

- **Use message only when necessary**: Add `message` only when the error `code` is insufficient for understanding the error
- **Context for LLM guidance**: Use `context` to provide meaningful information for LLM error handling, not duplicate data
- **Avoid duplication**: Context should not duplicate information from `message` or `code`
- **Grouping by code**: All errors/warnings with the same `code` are grouped together regardless of message
- **Descriptive error codes**: Use specific, descriptive error codes that clearly indicate the problem
- **Create error utilities**: Build helper functions for common error patterns to ensure consistency

#### Good Examples

```typescript
// Good: Code is self-explanatory, context provides actionable info
session.logger.addError({
  code: 'FILE_NOT_FOUND',
  context: { path: '/missing/file.txt', suggestion: 'check file permissions' }
});

// Good: Message adds clarity when code isn't enough
session.logger.addError({
  code: 'VALIDATION_ERROR',
  message: 'Email format is invalid',
  context: { field: 'email', value: 'invalid-email' }
});

// Good: Specific, descriptive error codes
session.logger.addError({
  code: 'FILE_NOT_FOUND',  // clearly indicates what's missing
  context: { path: '/config.json' }
});

// Good: Error utility functions for consistency
function fileNotFoundError(path: string) {
  return {
    code: 'FILE_NOT_FOUND' as const,
    context: { path }
  };
}

session.logger.addError(fileNotFoundError('/missing/file.txt'));
```

#### Avoid

```typescript
// Bad: Message duplicates what code already says
session.logger.addError({
  code: 'FILE_NOT_FOUND',
  message: 'File not found',  // redundant
  context: { path: '/missing/file.txt' }
});

// Bad: Context duplicates message information
session.logger.addError({
  code: 'VALIDATION_ERROR',
  message: 'Invalid email format',
  context: { error: 'Invalid email format' }  // duplicates message
});

// Bad: Vague, non-descriptive error codes
session.logger.addError({
  code: 'NOT_FOUND',  // what wasn't found?
  context: { path: '/config.json' }
});

// Bad: Generic error codes
session.logger.addError({
  code: 'ERROR',  // too generic, provides no useful information
  context: { operation: 'file-read' }
});
```

## Modules

- **McpBuilder** - Build and register MCP tools with validation
- **McpSession** - Handle MCP requests and critical error management  
- **Logger** - Independent error/warning collection and analysis

## Requirements

- Node.js 18+
- TypeScript project (recommended)
- MCP-compatible environment

## License

MIT 