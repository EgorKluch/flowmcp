# Logger

Independent error and warning collection utility with automatic grouping and frequency analysis.

## Installation

```bash
npm install flowmcp
```

## Basic Usage

```typescript
import { Logger } from 'flowmcp';

const logger = new Logger();

// Add errors with automatic grouping
logger.addError({ 
  code: 'VALIDATION_FAILED', 
  message: 'Invalid input format',
  context: { field: 'email' }
});

// Add warnings  
logger.addWarning({
  code: 'DEPRECATED_API',
  message: 'Using outdated endpoint',
  context: { endpoint: '/api/v1/users' }
});

// Get prioritized summary (top 10 most frequent)
const { errors, warnings } = logger.getResponse();

console.log('Critical errors:', errors);
console.log('Warnings:', warnings);
```

## Key Features

- **Automatic Grouping** - Groups similar errors/warnings by code and message
- **Frequency Analysis** - Prioritizes most frequent issues first
- **Context Tracking** - Maintains detailed context for each occurrence
- **Independent** - No external dependencies, works standalone
- **Type Safe** - Full TypeScript support with generic error/warning types

## Integration

Perfect for error collection in any application:

```typescript
// Custom error types
type MyError = {
  code: string;
  message: string;
  context?: { userId?: string; action?: string };
};

const logger = new Logger<MyError, MyWarning>();

// Automatic deduplication and frequency counting
logger.addError({ code: 'AUTH_FAILED', message: 'Invalid token', context: { userId: '123' }});
logger.addError({ code: 'AUTH_FAILED', message: 'Invalid token', context: { userId: '456' }});

// Returns grouped result with both contexts
const response = logger.getResponse();
// response.errors[0].contexts = [{ userId: '123' }, { userId: '456' }]
```

## Requirements

- Node.js 18+
- TypeScript (recommended) 