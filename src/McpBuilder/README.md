# McpBuilder

Build and register MCP (Model Context Protocol) tools with automatic schema validation and project path injection.

## Installation

```bash
npm install flowmcp
```

## Basic Usage

```typescript
import { McpBuilder } from 'flowmcp';

const builder = new McpBuilder();

// Define your tool
const myTool = {
  name: 'process_file',
  description: 'Process a file in the project',
  inputSchema: {
    type: 'object',
    properties: {
      filename: { type: 'string' },
      action: { type: 'string', enum: ['read', 'write', 'delete'] }
    },
    required: ['filename', 'action']
  }
};

// Register with handler
const result = builder.addTool(myTool, async (request) => {
  const { project, filename, action } = request.params.arguments;
  
  // project is automatically validated as absolute path
  // Your tool logic here
  
  return {
    content: [{ type: 'text', text: `Processed ${filename} in ${project}` }],
    isError: false
  };
});

if (!result.success) {
  console.log('Registration failed:', result.errors);
}
```

## Key Features

- **Automatic Project Parameter** - Adds required `project` parameter to all tools
- **Path Validation** - Validates project paths are absolute (Unix/Windows)
- **Schema Extension** - Extends your schema while preserving original structure
- **Error Handling** - Built-in validation and error collection
- **Type Safe** - Full TypeScript support with proper tool types

## Integration

All registered tools automatically receive a validated `project` parameter:

```typescript
// Your tool schema
const toolSchema = {
  properties: {
    filename: { type: 'string' }
  },
  required: ['filename']
};

// McpBuilder extends it to:
// {
//   properties: {
//     project: { type: 'string', description: 'Absolute path to project directory' },
//     filename: { type: 'string' }
//   },
//   required: ['project', 'filename']
// }
```

Your handler receives the validated project path along with your defined parameters.

## Error Handling

```typescript
const result = builder.addTool(invalidTool, handler);

if (!result.success) {
  result.errors.forEach(error => {
    console.log(`${error.code}: ${error.message}`);
  });
}
```

## Requirements

- Node.js 18+
- MCP-compatible environment 