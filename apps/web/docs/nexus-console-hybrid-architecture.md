# Nexus Console Hybrid Architecture

## Overview
Following the Happy-DevKit team's recommendation, we've implemented a hybrid approach that maintains Nexus Console's direct WebSocket connection for PTY communication while optionally integrating with the bridge server for enhanced features.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Happy Observatory Web                       │
│                                                                 │
│  ┌─────────────────────┐         ┌──────────────────────────┐ │
│  │   Nexus Console     │         │   Terminal Discovery     │ │
│  │   Integration       │◄────────┤   & Metrics Hook         │ │
│  └──────────┬──────────┘         └────────────┬─────────────┘ │
│             │                                  │                │
└─────────────┼──────────────────────────────────┼───────────────┘
              │                                  │
              │ Direct WebSocket                 │ REST API
              │ (PTY Stream)                     │ (Optional)
              │                                  │
              ▼                                  ▼
┌─────────────────────────┐         ┌────────────────────────────┐
│   Nexus Console         │         │   Bridge Server            │
│   (Port 3001)           │         │   (Port 8080)              │
│                         │         │                            │
│  • PTY Management       │         │  • Terminal Discovery      │
│  • WebSocket Server     │         │  • Metrics Collection      │
│  • Direct I/O           │         │  • Session Tracking        │
│  • Shell Integration    │         │  • Auth Coordination       │
└─────────────────────────┘         └────────────────────────────┘
```

## Key Design Principles

### 1. **Direct PTY Connection (Performance Critical)**
- Nexus Console maintains direct WebSocket connection to terminal
- No routing through bridge server for keystrokes/output
- Zero additional latency for terminal operations
- Binary-safe for all terminal protocols

### 2. **Optional Bridge Enhancement**
- Bridge server provides discovery and metrics when available
- Graceful fallback if bridge is unavailable
- No hard dependency on bridge for core functionality

## Implementation Details

### Terminal Discovery Hook
```typescript
// Discovers available terminal endpoints via bridge
const { endpoints, getBestEndpoint } = useTerminalDiscovery(projectId)

// Falls back to direct connection if bridge unavailable
const endpoint = getBestEndpoint('local') || {
  url: 'http://localhost:3001',
  type: 'local'
}
```

### Metrics Reporting
```typescript
// Report metrics to bridge (fire-and-forget)
reportMetrics({
  endpoint: terminalUrl,
  sessionsActive: 1,
  totalCommands: commandCount,
  lastActivity: new Date()
})
```

### Benefits of This Approach

1. **Performance**
   - No latency overhead for terminal I/O
   - Direct binary stream support
   - Optimal user experience

2. **Reliability**
   - Terminal works without bridge
   - No single point of failure
   - Graceful degradation

3. **Scalability**
   - PTY connections don't burden bridge
   - Metrics are batched and async
   - Clean separation of concerns

4. **Flexibility**
   - Easy to add new terminal types
   - Bridge can enhance without breaking
   - Future-proof architecture

## Bridge Server API Endpoints

### Terminal Discovery
```http
POST /api/terminals/discover
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "project-123"
}

Response:
{
  "endpoints": [
    {
      "id": "local-1",
      "projectId": "project-123",
      "url": "http://localhost:3001",
      "type": "local",
      "status": "active",
      "metadata": {
        "cwd": "/home/user/project",
        "shell": "/bin/zsh"
      }
    }
  ]
}
```

### Metrics Reporting
```http
POST /api/terminals/metrics
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "project-123",
  "endpoint": "http://localhost:3001",
  "sessionsActive": 2,
  "totalCommands": 150,
  "cpuUsage": 12.5,
  "memoryUsage": 256,
  "timestamp": "2024-01-09T10:30:00Z"
}
```

### Metrics Retrieval
```http
GET /api/terminals/{endpointId}/metrics
Authorization: Bearer <token>

Response:
{
  "endpoint": "http://localhost:3001",
  "sessionsActive": 2,
  "totalCommands": 1523,
  "cpuUsage": 15.2,
  "memoryUsage": 312,
  "lastActivity": "2024-01-09T10:35:00Z",
  "uptime": 86400
}
```

## Configuration

### Environment Variables
```bash
# Direct terminal connection (required)
NEXT_PUBLIC_NEXUS_CONSOLE_URL=http://localhost:3001

# Bridge server (optional enhancements)
NEXT_PUBLIC_BRIDGE_SERVER_URL=http://localhost:8080
```

### Feature Flags
```typescript
// Enable/disable bridge integration
const ENABLE_BRIDGE_METRICS = process.env.NEXT_PUBLIC_BRIDGE_SERVER_URL !== undefined

// Use discovered endpoints or direct connection
const USE_TERMINAL_DISCOVERY = true
```

## Future Enhancements

1. **Multi-Terminal Support**
   - Connect to remote terminals
   - Container-based terminals
   - Cloud-hosted terminals

2. **Session Persistence**
   - Save/restore terminal sessions
   - Command history sync
   - Workspace state

3. **Advanced Metrics**
   - Resource usage tracking
   - Command analytics
   - Performance insights

4. **Security Enhancements**
   - Terminal access policies
   - Audit logging
   - Session recording

## Testing

### Standalone Mode (No Bridge)
```bash
# Start only Nexus Console
cd nexus-console
npm run dev

# Terminal should work fully without bridge
```

### Enhanced Mode (With Bridge)
```bash
# Start bridge server
cd happy-devkit
npm run bridge

# Start Nexus Console
cd nexus-console
npm run dev

# Verify discovery and metrics in console
```

## Conclusion

This hybrid architecture provides the best of both worlds:
- **High-performance** direct terminal connection
- **Optional enhancements** via bridge integration
- **Clean boundaries** between concerns
- **Future flexibility** without breaking changes

The implementation respects the fundamental difference between real-time PTY streams and REST/metrics APIs while allowing both systems to complement each other when available.