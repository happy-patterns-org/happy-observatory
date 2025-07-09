# Observatory Refactor Support Documentation

## Phase 2 Extensions - Bridge Server Integration

This document outlines the changes made to support the updated happy-devkit bridge server with dynamic project discovery and enriched metadata.

## Project ID Format

The observatory now accepts two formats for project IDs:

1. **UUID Format**: Standard UUID v4 format
   - Example: `123e4567-e89b-12d3-a456-426614174000`
   - Regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

2. **Slug Format**: Human-friendly identifiers
   - Example: `devkit`, `scopecam`, `my-awesome-project`
   - Regex: `/^[a-z0-9-]{3,64}$/i`
   - Rules:
     - 3-64 characters in length
     - Alphanumeric characters and hyphens only
     - Case-insensitive matching

## API Endpoints

All project-scoped endpoints follow the pattern:
```
/api/projects/{projectId}/...
```

Where `{projectId}` can be either a UUID or slug.

### Project Discovery
```
GET /api/projects
```
Returns a list of all available projects with metadata.

### Project-Scoped Endpoints
- `GET /api/projects/{projectId}/agents/status`
- `POST /api/projects/{projectId}/agents/command`
- `GET /api/projects/{projectId}/telemetry/metrics`
- `POST /api/projects/{projectId}/console/execute`

## Project Metadata

Projects now include enriched metadata:

```typescript
interface Project {
  id: string              // UUID or slug
  name: string            // Display name
  path: string            // File system path
  description?: string    // Project description
  icon?: string          // Emoji or icon identifier
  color?: string         // Hex color code
  dashboards?: Record<string, DashboardConfig>
  telemetryMap?: Record<string, string>
  hasSubmoduleMCP?: boolean
  mcpServerUrl?: string
  // ... runtime fields
}
```

### Dashboard Configuration
```typescript
interface DashboardConfig {
  id: string
  name: string
  widgets: string[]
}
```

### Telemetry Mapping
Maps logical metric names to actual telemetry keys:
```typescript
telemetryMap: {
  cpu: 'system.cpu.usage',
  memory: 'system.memory.usage',
  builds: 'devkit.builds.total'
}
```

## WebSocket Connections

Project-scoped WebSocket connections:
```
ws://localhost:8080/ws/projects/{projectId}
```

## Integration with Bridge Server

The observatory automatically:
1. Fetches project list from bridge server on startup
2. Merges server projects with locally stored projects
3. Preserves local runtime state (connections, activity)
4. Updates metadata from server (icon, color, dashboards)

## Testing

Run integration tests for project ID validation:
```bash
npm test -- slug-uuid.test.ts
```

## Environment Variables

No new environment variables required. The existing bridge server URL is used:
- `NEXT_PUBLIC_BRIDGE_SERVER_URL` - Bridge server REST API
- `NEXT_PUBLIC_BRIDGE_WS_URL` - Bridge server WebSocket endpoint

## UI Enhancements

The project chooser now displays:
- Project icons (emojis)
- Project colors (as accent colors)
- Visual indicators for MCP servers
- Active agent counts

## Migration Notes

1. Existing projects with UUID IDs continue to work
2. New projects can use human-friendly slugs
3. Server-provided metadata takes precedence over local data
4. All routes consistently use plural "projects"