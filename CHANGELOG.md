# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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