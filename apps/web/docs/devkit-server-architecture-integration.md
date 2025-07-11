# DevKit Server Architecture Integration Guide

## Server Topology Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Happy Observatory Dashboard (Port 3000)              │
│                              Next.js Web UI                              │
└─────────────┬──────────────────┬────────────────┬──────────────────────┘
              │                  │                │
              │ HTTP/WS          │ HTTP/WS        │ HTTP
              │                  │                │
┌─────────────▼────────┐ ┌──────▼──────┐ ┌──────▼──────────────────────┐
│  Bridge Server       │ │ Observatory  │ │  MCP Daemon Status Server   │
│  (Port 8080)         │ │ Test Server  │ │  (Port 8090)                │
│                      │ │ (Port 8765)  │ │                             │
│ • /api/mcp/context   │ │              │ │ • /status                   │
│ • /api/bridge/status │ │ • Agent APIs │ │ • /capabilities             │
│ • WebSocket + ping   │ │ • Telemetry  │ │ • /health                   │
│ • Rate limiting      │ │ • Console    │ │ • /metrics                  │
└──────────────────────┘ │ • WebSocket  │ └─────────────────────────────┘
                         └──────────────┘
```

## Integration Updates for Observatory

### 1. Update Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_BRIDGE_SERVER_URL=http://localhost:8080
NEXT_PUBLIC_MCP_DAEMON_URL=http://localhost:8090
NEXT_PUBLIC_OBSERVATORY_TEST_SERVER_URL=http://localhost:8765
```

### 2. Update MCP Detection Logic

```typescript
// src/lib/mcp-detector-enhanced.ts
export async function detectMCPServer(
  projectPath: string,
  options: MCPConnectionOptions = {}
): Promise<MCPServerInfo> {
  // First, check if this is the MCP daemon "project"
  if (projectPath === 'mcp-daemon' || projectPath.includes('mcp-daemon')) {
    try {
      // Check daemon status server
      const daemonResponse = await fetchWithTimeout(
        `${env.NEXT_PUBLIC_MCP_DAEMON_URL}/status`,
        opts.timeout
      )
      
      if (daemonResponse.ok) {
        const status = await daemonResponse.json()
        
        // Check Observatory test server
        const obsResponse = await fetchWithTimeout(
          `${env.NEXT_PUBLIC_OBSERVATORY_TEST_SERVER_URL}/health`,
          opts.timeout
        )
        
        if (obsResponse.ok) {
          return {
            isAvailable: true,
            serverUrl: env.NEXT_PUBLIC_OBSERVATORY_TEST_SERVER_URL,
            config: {
              name: 'MCP Daemon',
              version: status.version,
              capabilities: status.capabilities || [],
              isDaemon: true
            }
          }
        }
      }
    } catch (error) {
      logger.debug('MCP daemon not available', { error })
    }
  }
  
  // Continue with regular project detection...
  // (existing code)
}
```

### 3. Add MCP Daemon as Special Project

```typescript
// src/store/project-store.ts
export const MCP_DAEMON_PROJECT: Project = {
  id: 'mcp-daemon',
  name: 'MCP Daemon',
  path: 'mcp-daemon', // Special path
  lastAccessed: new Date(),
  isFavorite: true,
  hasSubmoduleMCP: true,
  mcpServerUrl: 'http://localhost:8765',
  wsUrl: 'ws://localhost:8765/ws/projects/mcp-daemon',
  connectionStatus: {
    mcp: 'disconnected',
    bridge: 'disconnected'
  },
  metadata: {
    type: 'daemon',
    description: 'Happy DevKit MCP Daemon',
    icon: '🤖'
  }
}

// Auto-add to projects list
export function initializeProjectStore() {
  const { addProject } = useProjectStore.getState()
  
  // Check if daemon is running
  fetch('http://localhost:8090/health')
    .then(res => {
      if (res.ok) {
        addProject(MCP_DAEMON_PROJECT)
        logger.info('MCP Daemon project added')
      }
    })
    .catch(() => {
      logger.debug('MCP Daemon not available')
    })
}
```

### 4. Update Agent Command Execution

```typescript
// src/lib/api/agent-commands.ts
export async function executeAgentCommand(
  projectId: string,
  command: string
) {
  // Special handling for MCP daemon
  if (projectId === 'mcp-daemon') {
    const response = await fetch(
      `${env.NEXT_PUBLIC_OBSERVATORY_TEST_SERVER_URL}/api/projects/mcp-daemon/agents/command`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ command })
      }
    )
    
    if (!response.ok) {
      throw new Error(`Command failed: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  // Regular project command execution
  // (existing code)
}
```

### 5. Update WebSocket Connection for MCP Daemon

```typescript
// src/hooks/use-project-websocket.ts
export function useProjectWebSocket(options: ProjectWebSocketOptions = {}) {
  // ... existing code ...
  
  const connect = useCallback(() => {
    if (!selectedProject?.id) return
    
    let wsUrl: string
    
    // Special handling for MCP daemon
    if (selectedProject.id === 'mcp-daemon') {
      wsUrl = 'ws://localhost:8765/ws/projects/mcp-daemon'
    } else {
      wsUrl = selectedProject.wsUrl || 
        `${env.NEXT_PUBLIC_BRIDGE_WS_URL}/projects/${selectedProject.id}`
    }
    
    // ... rest of connection logic ...
  }, [selectedProject, options])
}
```

### 6. Add Daemon-Specific UI Elements

```typescript
// src/components/project-card.tsx
export function ProjectCard({ project }: { project: Project }) {
  const isDaemon = project.metadata?.type === 'daemon'
  
  return (
    <div className={cn(
      "border rounded-lg p-4",
      isDaemon && "border-purple-500 bg-purple-50"
    )}>
      <div className="flex items-center gap-2">
        {isDaemon && <Badge variant="purple">Daemon</Badge>}
        <h3>{project.name}</h3>
      </div>
      
      {isDaemon && (
        <div className="mt-2 text-sm text-gray-600">
          <p>MCP Tools: {project.config?.capabilities?.length || 0}</p>
          <p>Status: Running on port 8090</p>
        </div>
      )}
    </div>
  )
}
```

### 7. Test the Complete Integration

```typescript
// src/lib/devkit-integration-tests.ts
export async function testDevKitIntegration() {
  const tests = []
  
  // Test 1: MCP Daemon Status Server
  tests.push(await testEndpoint(
    'MCP Daemon Status',
    'http://localhost:8090/status',
    (data) => data.daemon_running === true
  ))
  
  // Test 2: Bridge Server MCP Context
  tests.push(await testEndpoint(
    'Bridge MCP Context',
    'http://localhost:8080/api/mcp/context',
    (data) => data.isAvailable === true
  ))
  
  // Test 3: Observatory Test Server
  tests.push(await testEndpoint(
    'Observatory Test Server',
    'http://localhost:8765/health',
    (data) => data.status === 'healthy'
  ))
  
  // Test 4: Agent Status
  tests.push(await testEndpoint(
    'MCP Daemon Agent Status',
    'http://localhost:8765/api/projects/mcp-daemon/agents/status',
    (data) => Array.isArray(data.agents)
  ))
  
  // Test 5: WebSocket Connection
  tests.push(await testWebSocket(
    'MCP Daemon WebSocket',
    'ws://localhost:8765/ws/projects/mcp-daemon'
  ))
  
  return tests
}

// Run in browser console:
// await testDevKitIntegration()
```

## Configuration Summary

### Ports and Services

1. **3000** - Observatory Dashboard (Next.js)
2. **8080** - Bridge Server (Enhanced)
3. **8090** - MCP Daemon Status Server
4. **8765** - Observatory Test Server

### Key Endpoints

#### Bridge Server (8080)
- `/api/mcp/context` - MCP discovery
- `/api/bridge/status` - Capabilities
- `/ws/*` - WebSocket with heartbeat

#### MCP Daemon Status (8090)
- `/status` - Process status
- `/capabilities` - Available tools
- `/health` - Simple check
- `/metrics` - Detailed metrics

#### Observatory Test Server (8765)
- `/api/projects/mcp-daemon/agents/status`
- `/api/projects/mcp-daemon/agents/command`
- `/api/projects/mcp-daemon/telemetry/metrics`
- `/api/projects/mcp-daemon/console/execute`
- `/ws/projects/mcp-daemon`

## Benefits of This Architecture

1. **Clean Separation** - Each server has a specific purpose
2. **No stdio Conflicts** - HTTP/WebSocket only for Observatory
3. **Scalable** - Can add more daemons/projects easily
4. **Observable** - Rich telemetry and status endpoints
5. **Reliable** - Independent services, graceful failures

## Next Steps

1. **Update Observatory** to auto-detect MCP daemon
2. **Add UI indicators** for daemon-type projects
3. **Create daemon-specific dashboards**
4. **Implement command palette** for MCP tools
5. **Add real-time metrics visualization**

The architecture is elegant and well-designed. Observatory can now fully monitor and control the MCP daemon through these dedicated endpoints!