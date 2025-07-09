# Agent Control & Status Alignment Guide

## Overview

Happy Observatory implements a unified agent control system that maintains consistency between dashboard controls and CLI commands, ensuring status is accurate across all viewpoints of the system.

## Architecture Principles

### 1. Unified Control Interface
- All agent controls (dashboard, CLI, API) use the same underlying execution path
- Commands are validated consistently regardless of source
- Status updates propagate to all connected clients in real-time

### 2. Status Consistency
- Single source of truth for agent status (agent system backend)
- Real-time synchronization via WebSocket and polling
- Optimistic UI updates with rollback on failure
- Status cache with automatic refresh every 2 seconds

### 3. Permission Model
- Commands are validated based on current agent state
- `canStart`, `canStop`, `canPause` flags determine available actions
- Dashboard UI automatically disables invalid actions
- Same validation logic used by CLI

## Implementation Details

### Agent Control Manager (`/lib/agent-control.ts`)

Central control system that:
- Maintains agent status cache
- Executes commands via unified API
- Validates commands before execution
- Notifies all subscribers of status changes
- Handles retry and error scenarios

```typescript
// Execute command from dashboard
const result = await executeCommand({
  agentId: 'orchestrator-001',
  command: 'start',
  parameters: { suite: 'all' }
})

// Same command from CLI
$ sct agent orchestrator-001 start --suite all
```

### Status Synchronization

1. **Real-time Updates**: WebSocket connection for immediate status changes
2. **Periodic Sync**: Every 2 seconds to ensure consistency
3. **Event-driven**: Telemetry events trigger status updates
4. **Optimistic UI**: Immediate feedback with rollback on failure

### Agent States

```
idle → running → completed
  ↓       ↓         ↑
  ↓    paused ←────┘
  ↓       ↓
  └──→ failed
```

### Control Flow

```
User Action → Validation → API Call → CLI Execution → Status Update → UI Update
     ↓             ↓           ↓            ↓              ↓            ↓
Dashboard    Permission    Unified    Same as CLI    Broadcast    All Views
  or CLI      Check         API      (exec/spawn)    via WS      Updated
```

## Dashboard Components

### Agent Status Monitor
- Shows all agents with current status
- Real-time updates via subscription
- Visual indicators for state changes
- Metrics display (completed tasks, failures, etc.)

### Test Dashboard Integration
- Embedded agent controls for test orchestration
- Start/Stop/Pause buttons with state validation
- Status indicators sync with CLI operations
- Tool execution tracked as agent activity

### Test Guardian
- Mode changes execute as agent commands
- Status reflects actual guardian agent state
- Auto-fix operations properly tracked
- Consistent with `sct guardian` CLI commands

## API Endpoints

### GET /api/agents/status
Returns current status of all agents
- Used by status sync mechanism
- Same data available via CLI: `sct agent list`

### POST /api/agents/command
Executes agent commands
- Validates permissions
- Executes actual CLI command
- Returns success/failure
- Same as: `sct agent <id> <command>`

## Status Indicators

### Visual States
- **Running**: Blue pulsing icon + "running" badge
- **Idle**: Gray static icon + "idle" badge  
- **Paused**: Yellow pause icon + "paused" badge
- **Failed**: Red X icon + "failed" badge
- **Completed**: Green check + "completed" badge

### Activity Tracking
- Last command timestamp and source (cli/dashboard/api)
- Current task progress (if available)
- Metrics: tasks completed, failed, average duration
- Uptime tracking for long-running agents

## Error Handling

### Command Failures
1. Validation errors shown immediately
2. Execution errors logged and displayed
3. Status rollback on failure
4. Retry logic for transient failures

### Connection Issues
1. Automatic reconnection for WebSocket
2. Fallback to polling if WebSocket fails
3. Offline indicator when disconnected
4. Queue commands for retry when reconnected

## Best Practices

### For Dashboard Development
1. Always use `useAgentControl` hook for consistency
2. Check permissions before showing controls
3. Show loading states during command execution
4. Display error messages from failed commands

### For CLI Integration
1. Use same API endpoints as dashboard
2. Return consistent status codes
3. Log all commands for debugging
4. Support same parameters as dashboard

### For Status Monitoring
1. Subscribe to real-time updates
2. Handle connection failures gracefully
3. Show last update timestamp
4. Indicate when data is stale

## Testing Considerations

### Status Consistency Tests
- Verify dashboard and CLI show same status
- Test status updates across multiple clients
- Validate permission checks match
- Ensure commands execute identically

### Integration Tests
- Test command execution from all sources
- Verify status propagation timing
- Test error scenarios and rollback
- Validate WebSocket reconnection

## Future Enhancements

1. **Command History**: Track all commands with full audit trail
2. **Bulk Operations**: Execute commands on multiple agents
3. **Scheduled Commands**: Queue commands for future execution
4. **Custom Actions**: Define project-specific agent commands
5. **Status Webhooks**: External integrations for status changes

## Troubleshooting

### Status Mismatch
1. Check WebSocket connection status
2. Verify API endpoint accessibility  
3. Look for errors in browser console
4. Check agent system logs

### Commands Not Working
1. Verify agent permissions (canStart, etc.)
2. Check for validation errors
3. Ensure API endpoints responding
4. Verify CLI command exists

### Performance Issues
1. Check status sync frequency
2. Monitor WebSocket message volume
3. Verify API response times
4. Look for memory leaks in subscriptions