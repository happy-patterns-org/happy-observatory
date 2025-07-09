# Happy Observatory - Bridge Server Integration Guide

## Overview

The Happy Observatory dashboard is now fully integrated with the Happy DevKit Bridge Server, providing real-time access to:
- MCP context and server information
- Agent status monitoring
- Telemetry metrics from SQLite databases
- File system project scanning
- Command execution capabilities
- WebSocket real-time updates

## Quick Start

### 1. Start the Bridge Server
In your Happy DevKit directory:
```bash
./scripts/dashboard-bridge-server.py
```

The bridge server will start on http://localhost:8080

### 2. Configure the Dashboard
The dashboard automatically uses the bridge server when `NEXT_PUBLIC_USE_REAL_DATA=true` is set in `.env.local`

### 3. Start the Dashboard
```bash
npm run dev
```

Visit http://localhost:3000/workspace

## Features Now Connected

### ✅ Real Data Sources

1. **MCP Detection**
   - Checks bridge server endpoint `/api/mcp/context`
   - Falls back to direct port scanning if bridge unavailable
   - Automatically connects when MCP server is detected

2. **Agent Status**
   - Real-time agent status from `/api/agents/status`
   - Shows actual running agents instead of mock data
   - Updates via WebSocket for live changes

3. **Telemetry Metrics**
   - System metrics (CPU, memory, disk usage)
   - Agent activity statistics
   - Performance metrics
   - Historical data from SQLite database

4. **Project Scanning**
   - Scans actual file system directories
   - Detects project types (npm, python, git)
   - Identifies MCP-enabled projects

5. **Console Commands**
   - Executes real commands via bridge server
   - Supports git operations, status checks, etc.
   - Command history preserved

6. **WebSocket Updates**
   - Real-time telemetry updates
   - Live agent status changes
   - Log streaming
   - Automatic reconnection on disconnect

## API Endpoints

All API endpoints proxy to the bridge server when real data is enabled:

### Dashboard APIs
- `GET /api/agents/status` → Bridge: `GET /api/agents/status`
- `GET /api/telemetry/metrics` → Bridge: `GET /api/telemetry/metrics`
- `POST /api/projects/scan` → Bridge: `POST /api/projects/scan`
- `POST /api/console/execute` → Bridge: `POST /api/console/execute`

### WebSocket Connection
- `ws://localhost:8080/ws` - Real-time updates

## Data Flow

```
Happy Observatory Dashboard
    ↓ (HTTP/WebSocket)
Bridge Server (port 8080)
    ↓ (Direct file access)
├── SQLite Databases
├── MCP Server (stdio)
└── File System
```

## Visual Indicators

The dashboard shows whether data is real or mocked:
- **No indicator** = Real data from bridge server
- **Yellow badge** = Simulated/mock data

## Fallback Behavior

If the bridge server is not running:
1. All endpoints fall back to mock data
2. Mock data indicators appear
3. Dashboard remains fully functional
4. No errors shown to user

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_BRIDGE_SERVER_URL=http://localhost:8080
NEXT_PUBLIC_BRIDGE_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_USE_REAL_DATA=true
```

Set `NEXT_PUBLIC_USE_REAL_DATA=false` to use mock data only.

## Troubleshooting

### Bridge Server Not Connecting
1. Check bridge server is running: `curl http://localhost:8080/api/health`
2. Verify CORS is enabled (bridge server includes CORS headers)
3. Check browser console for connection errors

### WebSocket Not Connecting
1. Check WebSocket URL in browser dev tools
2. Verify no proxy/firewall blocking WebSocket
3. Check bridge server logs for connection attempts

### No Real Data Showing
1. Verify `.env.local` has `NEXT_PUBLIC_USE_REAL_DATA=true`
2. Restart Next.js dev server after changing env vars
3. Check Network tab for API calls to bridge server

## Development Tips

1. **Testing Without Bridge**: Set `NEXT_PUBLIC_USE_REAL_DATA=false`
2. **Debugging**: Check browser console for bridge connection logs
3. **Performance**: WebSocket reduces polling overhead
4. **Security**: Bridge server should only run locally

## Next Steps

With the bridge server integration complete, you can:
1. Monitor real agent activity
2. View actual system metrics
3. Execute commands from the console
4. Track telemetry in real-time
5. Scan and manage local projects

The dashboard now provides a complete view into your Happy DevKit system!