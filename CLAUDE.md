# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Build: `npx tsc` - Compiles TypeScript using tsc
- Clean: `./clean.sh` - Removes compiled JS, map, and declaration files
- Test: `npx mocha` - Runs tests using Mocha (test files use .test.ts extension)

## Architecture Overview
This is a multi-warehouse data connector library that provides a unified interface for querying BigQuery and Snowflake. The codebase follows a modular structure:

- **Main Entry Point**: `index.ts` re-exports everything from `lib/index.js`
- **Core Modules**: 
  - `lib/bigquery.ts` - BigQuery client with query/insert operations and data formatting
  - `lib/snowflake.ts` - Snowflake client with connection pooling, query/execute/insert operations
  - `lib/utilities.ts` - Shared utility functions

## Key Technical Details
- **Environment Variables**: Snowflake requires `SNOWFLAKE_CREDENTIALS` (comma-separated key:value pairs)
- **Connection Management**: Snowflake uses connection pooling with configurable max connections via `SNOWFLAKE_POOL_MAX`
- **Query Parameters**: Both connectors support parameterized queries with different binding formats
- **Data Formatting**: Both connectors normalize result formats (BigQuery dates/timestamps, Snowflake lowercase keys)
- **Verbose Logging**: Set `VERBOSE=1` to enable query logging and timing information
- **Type Safety**: Uses TypeScript with strict mode, ESNext target, and ES modules

## Code Style Guidelines
- Use ES module imports (`import x from 'y'`)
- TypeScript with strict mode enabled
- Use camelCase for variables/functions, PascalCase for classes/interfaces
- Error handling with try/catch for async operations
- Keep code self-explanatory with minimal commenting