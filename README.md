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
      message: `Failed to read file: ${error.message}`,
      context: { project, filename }
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
      code: 'CRITICAL_ERROR', 
      message: 'Operation failed',
      context: { reason: 'invalid input' }
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

// Collect and group errors
logger.addError({ code: 'VALIDATION', message: 'Invalid format' });
logger.addWarning({ code: 'DEPRECATED', message: 'Old API usage' });

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
      message: error.message,
      context: { project, data }
    });
    
    return session.getResult({ error: error.message });
  }
});

// Apply all registered tools to the server
builder.applyToServer(server);

// Start the server
server.connect(transport);
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