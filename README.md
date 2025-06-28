# MCP Manager

A development toolkit for creating and managing MCP (Model Context Protocol) tools with automatic project path validation.

## Installation

```bash
npm install mcp-manager
```

## Key Features

- **Tool Management** - Register and manage MCP tools with automatic schema validation
- **Project Path Validation** - Automatic project parameter injection and validation for all tools  
- **Error Handling** - Built-in error and warning management with automatic grouping
- **TypeScript Support** - Full TypeScript definitions included

## Basic Usage

### Register MCP Tools

```typescript
import { McpManager } from 'mcp-manager';

const manager = new McpManager();

// Define your tool
const myTool = {
  name: 'process_file',
  description: 'Process a file in the project',
  inputSchema: {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'File to process' },
      action: { type: 'string', enum: ['read', 'write', 'delete'] }
    },
    required: ['filename', 'action'],
    additionalProperties: false
  }
};

// Register tool with handler
const result = manager.addTool(myTool, async (request) => {
  const { project, filename, action } = request.params.arguments;
  // Tool logic here - project parameter is automatically validated
  return { content: [{ type: 'text', text: `Processed ${filename}` }] };
});

if (!result.success) {
  console.log('Errors:', result.errors);
}
```

### Error and Warning Management

```typescript
import { Logger } from 'mcp-manager';

const manager = new McpManager();
const response = manager.getResponse({ message: 'Hello, world!' });

if (response.success) {
  console.log('Success:', response.data);
  if (response.warnings) {
    console.log('Warnings:', response.warnings);
  }
} else {
  console.log('Errors:', response.errors);
}
```

## Integration

All registered tools automatically receive a `project` parameter that:
- Must be an absolute path to the project directory
- Is validated before tool execution
- Is added to your tool's schema automatically

Your tool handler will receive the validated project path along with your defined parameters.

## Requirements

- Node.js 18+
- TypeScript project (recommended)

## License

MIT 