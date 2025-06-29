# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1]

### Added
- **Logger.hasError(name: string)** method to check if specific error exists by code
- **Logger.hasWarning(name: string)** method to check if specific warning exists by code
- **Logger.getError(name: string)** method to get specific error by code as-is
- **Logger.getWarning(name: string)** method to get specific warning by code as-is

### Changed
- Logger methods now provide granular access to specific errors and warnings by name/code
- Enhanced error and warning inspection capabilities for better debugging
- Achieved 100% test coverage across all modules (Logger, McpBuilder, McpSession)

### Removed
- **BREAKING**: `McpSession.throwError()` method removed for security reasons
- **BREAKING**: `McpInterruptError` class completely removed
- **BREAKING**: `McpSession.Error` and `McpSession.Warning` types removed (use `Logger.Error` and `Logger.Warning` instead)

### Migration Guide
- **Error Handling**: Replace `session.throwError({ code, message, context })` with `session.logger.addError({ code, message, context })` followed by `return session.getResult({})`
- **Error Types**: Replace `McpSession.Error` and `McpSession.Warning` with `Logger.Error` and `Logger.Warning`
- **Error Inspection**: Use new `session.logger.hasError(code)` and `session.logger.getError(code)` methods for specific error checking

## [2.1.0]

### Added
- **McpBuilder.applyToServer()** method for applying registered tools to MCP Server
- Repository URL in package.json for better npm integration
- Comprehensive test coverage for new API changes

### Changed
- **BREAKING**: McpSession API completely redesigned:
  - Replaced `getResponse<TData>(): McpSession.Response<TData>` with `getResult<TData>(): CallToolResult`
  - Removed custom response types (`SuccessResponse`, `ErrorResponse`, `Response`)
  - Now returns native MCP SDK `CallToolResult` for better protocol compliance
- **BREAKING**: McpBuilder ToolHandler signature changed:
  - Old: `(request: CallToolRequest) => Promise<CallToolResult>`
  - New: `(session: McpSession, request: CallToolRequest) => Promise<CallToolResult>`
  - Session is now passed as first parameter to all tool handlers

### Removed
- **BREAKING**: `McpToolError` class completely removed
  - No longer exported from public API
  - Replaced with `session.throwError()` for consistent error handling
  - All error throwing now goes through McpSession

### Fixed
- TypeScript compilation errors due to removed exports
- Better error handling consistency across the API

### Migration Guide
- **Tool Handlers**: Update signature to accept `session` as first parameter: `async (session, request) => { ... }`
- **Response Generation**: Replace `session.getResponse(data)` with `session.getResult(data)`
- **Error Handling**: Replace `throw new McpToolError(...)` with `session.throwError({ code, message, context })`
- **Server Integration**: Use `builder.applyToServer(server)` to register tools with MCP server

## [2.0.0]

### Added
- **McpBuilder** module for MCP tool building with automatic schema validation
- **McpSession** module for MCP request session handling and critical error management
- 100% test coverage across all modules
- Module-specific documentation rules for Logger, McpBuilder, and McpSession
- User-focused README files for each module

### Changed
- **BREAKING**: Split McpManager into two specialized modules (McpBuilder and McpSession)
- **BREAKING**: Logger is now completely independent with no external dependencies
- Removed unnecessary `@types/json-schema` dependency by defining minimal schema types internally
- Updated main README to reflect new modular architecture
- Improved project structure with local module rules

### Removed
- **BREAKING**: McpManager class (replaced by McpBuilder and McpSession)

### Migration Guide
- Replace `McpManager` imports with `McpBuilder` for tool registration
- Use `McpSession` for session-level error handling and response generation
- Logger can now be used independently without manager instance
- Update imports: `import { McpBuilder, McpSession, Logger } from 'flowmcp'`

## [1.1.0]

### Changed
- **BREAKING**: Package renamed from `mcp-manager` to `flowmcp`
- Enhanced description to reflect future workflow and process automation capabilities
- Updated keywords to include workflow, processes, scenarios, and automation

### Migration Guide
- Update your imports: `import { McpManager } from 'flowmcp'` (instead of 'mcp-manager')
- Update package.json dependency: `"flowmcp": "^1.1.0"`

## [1.0.0]

### Added
- McpManager class for registering and managing MCP tools
- Automatic project parameter injection for all registered tools
- Project path validation (must be absolute path)
- Logger with automatic error and warning grouping
- Tool schema validation and extension
- TypeScript definitions for all public APIs
- Error handling with detailed error codes and context 