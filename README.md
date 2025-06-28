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
}, async (request) => {
  const { project, filename } = request.params.arguments;
  // project is validated as absolute path
  
  return {
    content: [{ type: 'text', text: `Reading ${filename} from ${project}` }],
    isError: false
  };
});
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
  
  // Generate responses (logger included)
  return session.getResponse({ success: true, data: 'result' });
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

Complete MCP tool workflow:

```typescript
import { McpBuilder, McpSession } from 'flowmcp';

const builder = new McpBuilder();

// Build tool with per-request session handling
builder.addTool({
  name: 'process_data',
  description: 'Process project data',
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'string' }
    }
  }
}, async (request) => {
  // Create session for this request
  const session = new McpSession();
  const { project, data } = request.params.arguments;
  
  try {
    // Process with automatic project validation
    const result = await processData(project, data);
    return session.getResponse({ success: true, result });
  } catch (error) {
    // Log error for analysis
    session.logger.addError({ 
      code: 'PROCESSING_ERROR', 
      message: error.message,
      context: { project, data }
    });
    
    // Return error response with logged errors
    return session.getResponse({ success: false, error: error.message });
  }
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