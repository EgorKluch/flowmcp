# McpSession

Handle MCP (Model Context Protocol) request sessions with error management and response generation.

## Installation

```bash
npm install flowmcp
```

## Basic Usage

```typescript
import { McpSession } from 'flowmcp';

const session = new McpSession();

// Handle critical errors that should stop execution
try {
  session.throwError({
    code: 'CRITICAL_FAILURE',
    message: 'Database connection lost',
    context: { database: 'primary' }
  });
} catch (error) {
  console.log('Critical error occurred:', error.message);
}

// Generate responses for MCP requests
const successResponse = session.getResponse({
  result: 'Operation completed successfully',
  metadata: { duration: '2.5s' }
});

const errorResponse = session.getResponse({
  error: 'Operation failed',
  details: { reason: 'Invalid input' }
});
```

## Key Features

- **Error Throwing** - Handles critical errors that require immediate attention
- **Response Generation** - Creates properly formatted MCP responses
- **Error Collection** - Integrates with Logger for error tracking
- **Context Preservation** - Maintains error context for debugging
- **Type Safe** - Full TypeScript support for error and response types

## Integration

Use with McpBuilder for complete MCP tool management:

```typescript
import { McpBuilder, McpSession } from 'flowmcp';

const builder = new McpBuilder();
const session = new McpSession();

builder.addTool({
  name: 'risky_operation',
  description: 'Performs operation that might fail critically',
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'string' }
    }
  }
}, async (request) => {
  try {
    // Perform operation
    const result = performRiskyOperation(request.params.arguments.data);
    
    return session.getResponse({ success: true, result });
  } catch (error) {
    // Critical error - stop execution
    session.throwError({
      code: 'OPERATION_FAILED',
      message: 'Critical operation failure',
      context: { originalError: error }
    });
  }
});
```

## Error Types

```typescript
// Built-in interrupt error for critical failures
import { McpInterruptError } from 'flowmcp';

// Custom error handling
session.throwError({
  code: 'CUSTOM_ERROR',
  message: 'Something went wrong',
  context: { userId: '123', action: 'delete' }
});
```

## Requirements

- Node.js 18+
- MCP-compatible environment 