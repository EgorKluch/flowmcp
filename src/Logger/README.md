# Logger Module

A self-contained logging module for collecting, grouping, and analyzing errors and warnings with frequency-based prioritization.

## Purpose

The Logger module provides centralized error and warning collection with intelligent grouping, context tracking, and frequency analysis. It aggregates similar errors/warnings and maintains context information to help identify the most critical issues.

## API

### Constructor

```typescript
new Logger<TError, TWarning>(opts: Logger.Opts<TError, TWarning>)
```

**Parameters:**
- `opts.manager` - McpManager instance reference

### Methods

#### `addError(error: TError): void`
Adds an error to the logger with automatic grouping by code and message.

**Parameters:**
- `error` - Error object with `code`, `message`, and optional `context`

#### `addWarning(warning: TWarning): void`
Adds a warning to the logger with automatic grouping by code and message.

**Parameters:**
- `warning` - Warning object with `code`, `message`, and optional `context`

#### `throwError(error: TError): void`
Adds an error to the logger and throws an exception.

**Parameters:**
- `error` - Error object to log and throw

#### `getResponse(): { errors: ErrorResponse[], warnings: WarningResponse[] }`
Returns the top 10 most frequent errors and warnings with their most frequent contexts.

**Returns:**
- `errors` - Array of top 10 errors, each with `message`, `code`, and `contexts` array
- `warnings` - Array of top 10 warnings, each with `message`, `code`, and `contexts` array

### Properties

- `errors` - Internal storage for error groups (readonly)
- `warnings` - Internal storage for warning groups (readonly)
- `manager` - Reference to McpManager instance

## Features

- **Automatic Grouping**: Groups errors/warnings by code and message
- **Context Tracking**: Maintains frequency count for each unique context
- **Frequency Analysis**: Sorts by occurrence frequency for priority identification
- **Top N Selection**: Returns only the most critical issues (top 10)
- **Type Safety**: Fully typed with generic constraints for error/warning types
- **Performance Optimized**: Efficient deduplication and context aggregation

## Usage Example

```typescript
import { Logger } from './Logger';
import { McpManager } from '../McpManager';

const manager = new McpManager({});
const logger = new Logger({ manager });

// Add errors
logger.addError({ 
  code: 'DB_CONNECTION', 
  message: 'Failed to connect to database',
  context: 'production-db-1'
});

// Add warnings
logger.addWarning({
  code: 'DEPRECATION',
  message: 'Using deprecated API endpoint',
  context: '/api/v1/users'
});

// Get prioritized summary
const response = logger.getResponse();
console.log(`Top error: ${response.errors[0]?.message}`);
```

## Dependencies

- `McpManager` - Parent manager instance (circular reference)
- `McpError` - Error type definition
- `McpWarning` - Warning type definition

## Testing

Comprehensive test suite with 100% code coverage including:
- Basic functionality tests
- Edge cases and error conditions
- Performance tests for large datasets
- Type safety validation 