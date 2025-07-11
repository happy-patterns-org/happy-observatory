# Nexus Console Integration Guide

## Overview
The Happy Observatory now supports both integrated and iframe modes for the Nexus Console. The integrated mode provides better performance and security, while iframe mode serves as a fallback.

## Installation

### Option 1: Integrated Mode (Recommended)
When the `@happy-devkit/nexus-console` package becomes available on npm:

```bash
npm install @happy-devkit/nexus-console
```

The app will automatically detect and use the integrated component with:
- Direct React component integration (no iframe)
- JWT authentication support
- Virtual scrolling for performance
- Theme synchronization
- Responsive design

### Option 2: Iframe Mode (Fallback)
If the package is not installed, the app automatically falls back to iframe mode:

1. Ensure nexus-console is running on port 3001:
```bash
cd ../nexus-console
npm run dev
```

2. The app will use iframe embedding with postMessage communication

## Configuration

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_NEXUS_CONSOLE_URL=http://localhost:3001
```

### Security Configuration
The integrated mode respects Happy Observatory's security policies:
- JWT authentication via Bearer tokens
- Content Security Policy compliance
- Rate limiting alignment
- CORS configuration

## Features

### Integrated Mode Features
- **No CSP Issues**: Direct component integration bypasses iframe restrictions
- **Shared Auth**: Uses Happy Observatory's JWT tokens
- **Performance**: Virtual scrolling for large log outputs
- **Theming**: Automatically matches parent app theme
- **Resizing**: Smooth resize with constraints (40-600px)

### Communication API
```typescript
// From parent to console
interface ParentToConsole {
  setProject(projectId: string): void
  streamLogs(logs: LogEntry[]): void
  updateAgentStatus(status: AgentStatus): void
}

// From console to parent
interface ConsoleToParent {
  onCommand: (command: string) => void
  onResize: (height: number) => void
  onError: (error: Error) => void
}
```

## Keyboard Shortcuts
- `Cmd+``: Toggle console collapse
- `Cmd+K`: Clear console
- `Cmd+L`: Focus input

## Troubleshooting

### Console Not Loading
1. Check if nexus-console server is running on port 3001
2. Verify NEXT_PUBLIC_NEXUS_CONSOLE_URL is set correctly
3. Check browser console for errors

### Authentication Issues
1. Ensure user is logged in to Happy Observatory
2. Check JWT token is being passed correctly
3. Verify token hasn't expired

### Integration Mode Not Working
1. Check if @happy-devkit/nexus-console is installed
2. Clear Next.js cache: `rm -rf .next`
3. Restart development server

## Future Enhancements
- WebSocket connection for real-time updates
- File browser integration
- Multi-tab support
- Command history persistence