# Nexus Console Integration Guide

## Overview

The Happy Observatory dashboard now integrates the powerful **nexus-console** terminal emulator, providing:
- Full terminal access with PTY support
- Native browser file system access
- Configurable security levels
- WebSocket-based real-time communication
- Seamless integration with Happy DevKit

## Quick Start

### 1. Start Nexus Console
The nexus-console should be running on port 3001:
```bash
# In the nexus-console directory
npm run dev
```

### 2. Start Happy Observatory
```bash
npm run dev
```

### 3. Access the Workspace
Navigate to http://localhost:3000/workspace

The console will be embedded at the bottom of the workspace. Press `⌘\`` (or `Ctrl+\``) to toggle it.

## Features

### 🖥️ Terminal Emulation
- Full PTY support via WebSocket at `/terminal/ws`
- ANSI color support
- Command history
- Auto-completion
- Multiple terminal sessions

### 📁 File System Access
- **Native Browser APIs** - Uses File System Access API when available
- **Server Fallback** - Falls back to WebSocket operations
- **Permission Handling** - Requests read/write permissions per file/directory
- **File Watching** - Server-based file change notifications

### 🔒 Security Levels
Configure security through the settings button (⚙️):
- **Strict** - Maximum security, limited commands
- **Standard** - Balanced security (recommended)
- **Permissive** - Full access, use with caution

### 🎨 Customization
- **Theme** - Dark or light mode
- **Font Size** - Adjustable from 10px to 20px
- **Features** - Toggle file access and WebSocket PTY
- **History Size** - Configure command history limit

### 🔑 Authentication
- **Bearer Token** - Optional token for unified authentication
- **Project Context** - Automatically sets working directory
- **Secure Communication** - All data encrypted in transit

## Configuration

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_NEXUS_CONSOLE_URL=http://localhost:3001
```

### URL Parameters
The console accepts these query parameters:
- `cwd` - Working directory path
- `token` - Bearer token for authentication
- `mode` - Display mode (embedded)
- `theme` - Color theme (dark/light)
- `security` - Security level
- `fontSize` - Terminal font size
- `fileAccess` - Enable file system access
- `pty` - Enable WebSocket PTY

## Integration Points

### 1. Project Context
When a project is selected in Happy Observatory, the console automatically:
- Sets the working directory to the project path
- Applies project-specific configurations
- Maintains session state per project

### 2. Command Execution
Send commands programmatically:
```typescript
import { nexusConsoleUtils } from '@/components/workspace/nexus-console'

// Execute a command
nexusConsoleUtils.sendCommand('npm test')

// Open a file
nexusConsoleUtils.openFile('/path/to/file.ts')
```

### 3. Message Communication
The console communicates via postMessage:
```typescript
// Listen for console events
window.addEventListener('message', (event) => {
  if (event.data.type === 'file-selected') {
    console.log('File selected:', event.data.path)
  }
})
```

### 4. Console States
- **Loading** - Shows spinner while console initializes
- **Error** - Displays helpful error message if console unavailable
- **Ready** - Fully interactive terminal

## Security Considerations

### Sandbox Configuration
The iframe uses these sandbox permissions:
- `allow-scripts` - Required for terminal functionality
- `allow-same-origin` - Needed for localStorage/cookies
- `allow-forms` - For input handling
- `allow-modals` - For permission prompts

### CORS Setup
Ensure nexus-console has proper CORS headers:
```javascript
// In nexus-console server
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))
```

## Keyboard Shortcuts

- **⌘\`** (Mac) / **Ctrl+\`** (PC) - Toggle console
- **⌘K** - Clear terminal
- **⌘C** - Cancel current command
- **↑/↓** - Navigate command history
- **Tab** - Auto-completion

## Troubleshooting

### Console Not Loading
1. Check nexus-console is running: `curl http://localhost:3001`
2. Verify CORS is properly configured
3. Check browser console for errors
4. Ensure no ad blockers are interfering

### File Access Issues
1. Browser must support File System Access API
2. User must grant permissions when prompted
3. Check security level in settings

### WebSocket Connection Failed
1. Verify `/terminal/ws` endpoint is accessible
2. Check for proxy/firewall blocking WebSocket
3. Ensure authentication token is valid

## Advanced Usage

### Custom Security Policies
Configure command sanitization:
```typescript
const config = {
  securityLevel: 'strict',
  allowedCommands: ['git', 'npm', 'yarn'],
  blockedPaths: ['/etc', '/sys']
}
```

### Multiple Sessions
Open multiple terminal tabs:
```typescript
// Each iframe can have its own session
const sessionId = crypto.randomUUID()
url.searchParams.set('session', sessionId)
```

### Event Streaming
Subscribe to real-time events:
```typescript
// Console emits various events
console.on('command:execute', (cmd) => {
  trackCommand(cmd)
})
```

## Next Steps

With nexus-console integrated, you can:
1. Execute commands directly in project context
2. Browse and edit files with native performance
3. Monitor real-time output from Happy DevKit agents
4. Customize security based on your needs
5. Extend functionality with custom commands

The console provides a powerful, secure terminal experience directly in your browser!