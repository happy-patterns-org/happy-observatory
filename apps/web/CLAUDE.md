# Happy Observatory - Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The server will be available at http://localhost:3000
# Note: Initial compilation may take 10-30 seconds
```

## Architecture Overview

### Project Structure
- `/src/app` - Next.js App Router pages and API routes
- `/src/components` - React components
  - `/scopecam` - ScopeCam-specific components
- `/src/lib` - Utility functions and business logic
  - `/scopecam` - ScopeCam integration (MCP tools, telemetry, etc.)
- `/src/store` - Zustand state management

### Key Features
1. **Project Awareness** - Workspace can connect to project-specific MCP servers
2. **ScopeCam Integration** - Full support for ScopeCam test orchestration
3. **Agent Control** - Unified control interface for CLI/dashboard consistency
4. **Real-time Monitoring** - WebSocket connections for live updates

## Common Commands

```bash
# Linting and type checking
npm run lint        # Run Biome linter
npx tsc --noEmit   # Check TypeScript types

# Testing
npm test           # Run tests
npm run test:watch # Run tests in watch mode

# Build
npm run build      # Production build
npm start          # Start production server
```

## Troubleshooting

### Server Won't Start
1. Check if port 3000 is available: `lsof -ti:3000`
2. Clear Next.js cache: `rm -rf .next`
3. Ensure NODE_ENV is set: `NODE_ENV=development npm run dev`
4. First compilation takes time - wait 10-30 seconds

### TypeScript Errors
1. Run `npx tsc --noEmit` to see all errors
2. Common issues:
   - Missing imports (especially types)
   - Test files need `@testing-library/jest-dom` types

### Connection Refused
- The dev server needs time to compile on first run
- Check `/api/health` endpoint once server is ready
- Use `npm run dev:custom` for diagnostic server with health checks

## Key Integration Points

### MCP (Model Context Protocol)
- Projects can have submodule MCP servers
- Auto-detection via `detectMCPServer()` 
- WebSocket connections with retry logic
- Path: `/src/lib/mcp-detector-enhanced.ts`

### ScopeCam MCP Tools
Located in `/src/lib/scopecam/mcp-tools.ts`:
1. `test_selector` - Intelligent test selection
2. `failure_analyzer` - Root cause analysis
3. `performance_tracker` - Performance monitoring
4. `dependency_mapper` - Test dependencies
5. `coverage_analyzer` - Coverage insights
6. `parallel_optimizer` - Parallel execution
7. `flaky_detector` - Flaky test detection

### Agent Control
- Unified control via `/src/lib/agent-control.ts`
- Ensures CLI/dashboard consistency
- Status synchronization across views

### Telemetry
- SQLite storage: `~/.local/state/agentic/telemetry/metrics.db`
- Prometheus export support
- WebSocket streaming for real-time data

## Security Considerations
- Path traversal prevention in all file operations
- Input validation with Zod schemas
- Secure WebSocket connections
- No secrets in code or logs

## Development Tips
1. Always use absolute imports (`@/...`)
2. Run linter before committing
3. Test with multiple projects for robustness
4. Monitor browser console for WebSocket issues
5. Use error boundaries to prevent crashes