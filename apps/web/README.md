# Happy Observatory Dashboard

## Overview

The Happy Observatory is a comprehensive development workspace dashboard that provides real-time monitoring, control, and orchestration capabilities for autonomous development agents. Built with Next.js 14 and TypeScript, it offers a modern, responsive interface for managing multiple development projects simultaneously.

### Key Capabilities

- **Unified Dashboard Layout** - Clean, modern interface with header and sidebar navigation
- **Project Awareness** - Select and manage multiple development projects from a single interface
- **Auto-Detection** - Automatically discover local development projects across your system
- **Real-time Metrics** - Monitor agent activity, system health, and project status with live updates
- **ScopeCam Integration** - Advanced test orchestration features for test-driven development
- **MCP Protocol Support** - Native integration with Model Context Protocol servers
- **WebSocket Communication** - Real-time bidirectional communication with agents
- **Security First** - Built-in authentication, authorization, and security headers

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Security](#security)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

### 1. Project Management

#### Project Discovery
- **Automatic Scanning** - Discovers projects in common development directories
- **Smart Detection** - Identifies projects by multiple indicators:
  - Git repositories (`.git` directories)
  - Node.js projects (`package.json`)
  - Python projects (`requirements.txt`, `pyproject.toml`)
  - MCP server configurations (`mcp.json`)
  - Monorepo structures

#### Project Chooser
- **Quick Switch** - Dropdown selector in the top-right corner
- **Recent Projects** - Shows recently accessed projects first
- **Search** - Filter projects by name or path
- **Status Indicators** - Visual indicators for project health
- **Add New** - Manual project addition with path validation

#### MCP Server Integration
- **Auto-Connect** - Automatically connects to project MCP servers
- **Connection Status** - Real-time connection state monitoring
- **Tool Discovery** - Dynamic discovery of available MCP tools
- **Event Streaming** - Live event updates from MCP servers

### 2. Dashboard Views

#### Activity Monitor (Default)
- **Agent Metrics** - Active agents, completed tasks, success rates
- **System Health** - CPU, memory, and network usage
- **Activity Feed** - Recent events and notifications
- **Performance Graphs** - Historical performance visualization

#### Agent Console
- **Live Status** - Real-time agent status updates
- **Command Execution** - Send commands to agents
- **Output Streaming** - Live console output display
- **Error Tracking** - Centralized error logging

#### Workspace Features
- **Multi-Mode Support** - DevKit and Nexus console modes
- **Integrated Terminal** - Built-in terminal for quick commands
- **File Explorer** - Browse project files without leaving the dashboard
- **Quick Actions** - Common tasks accessible via shortcuts

### 3. ScopeCam Integration

When a ScopeCam-enabled project is detected, additional specialized views become available:

#### Test Dashboard
- **Test Metrics** - Pass/fail rates, execution times, coverage
- **Flaky Test Detection** - Identifies unstable tests
- **Performance Tracking** - Test execution performance over time
- **Dependency Mapping** - Visualize test dependencies
- **Coverage Analysis** - Code coverage insights

#### Shell Terminal
- **Direct Execution** - Run ScopeCam commands directly
- **Command History** - Access previous commands
- **Auto-Completion** - Smart command suggestions
- **Output Formatting** - Structured output display

#### MCP Tools for Testing
1. `test_selector` - Intelligent test selection based on changes
2. `failure_analyzer` - Root cause analysis for test failures
3. `performance_tracker` - Track test performance metrics
4. `dependency_mapper` - Map test dependencies
5. `coverage_analyzer` - Analyze code coverage
6. `parallel_optimizer` - Optimize parallel test execution
7. `flaky_detector` - Detect and track flaky tests

### 4. Real-time Monitoring

#### Live Metrics
- **Agent Activity** - Number of active agents and their status
- **Task Progress** - Real-time task completion tracking
- **Resource Usage** - CPU, memory, and network utilization
- **Error Rates** - Error frequency and types

#### Connection Management
- **WebSocket Status** - Live connection state
- **Automatic Reconnection** - Handles connection drops gracefully
- **Latency Monitoring** - Track response times
- **Health Checks** - Periodic system health validation

#### Activity Feed
- **Event Stream** - Real-time event notifications
- **Filtering** - Filter by event type or severity
- **Search** - Find specific events
- **Export** - Export event logs for analysis

## Installation

### Prerequisites

- Node.js 18.x or 20.x
- npm 9.x or higher
- Git
- Optional: Docker for containerized deployment

### Quick Start

```bash
# Clone the repository
git clone https://github.com/happy-patterns-org/happy-observatory.git
cd happy-observatory/apps/web

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev

# The dashboard will be available at http://localhost:3000
```

### Production Deployment

```bash
# Build for production
npm run build

# Start production server
npm start

# Or use Docker
docker build -t happy-observatory .
docker run -p 3000:3000 happy-observatory
```

## Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Bridge Server (for agent communication)
BRIDGE_API_URL=http://localhost:52521
BRIDGE_WS_URL=ws://localhost:52521

# Security
CSP_REPORT_URI=/api/csp-report
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
TELEMETRY_ENABLED=true
TELEMETRY_ENDPOINT=/api/telemetry

# Development
NODE_ENV=development
NEXT_PUBLIC_MOCK_MODE=false
```

### Project Detection Paths

The system searches for projects in these default locations:

```javascript
const DEFAULT_SEARCH_PATHS = [
  '~/Development',
  '~/Projects',
  '~/dev',
  '~/workspace',
  '~/code',
  '~/repos',
  '~/github'
]
```

You can customize these in `src/lib/project-scanner.ts`.

## Usage

### With Real Data (Bridge Server)

1. **Start the Bridge Server** (in happy-devkit):
   ```bash
   cd ../happy-devkit
   ./scripts/dashboard-bridge-server.py
   ```

2. **Start the Dashboard**:
   ```bash
   npm run dev
   ```

3. **Open Browser**: Navigate to http://localhost:3000

4. **Add Projects**:
   - Click the project chooser (top-right)
   - Select "Auto-detect Projects" or "Add Project"
   - Choose your active project

5. **Monitor Activity**:
   - View real-time metrics on the dashboard
   - Check agent status in the Agent Console
   - Execute commands via the integrated terminal

### Standalone Mode (Mock Data)

For development or testing without a bridge server:

1. **Enable Mock Mode**:
   ```bash
   NEXT_PUBLIC_MOCK_MODE=true npm run dev
   ```

2. **Access Dashboard**: http://localhost:3000

3. **Features**: All features work with simulated data (indicated by yellow status indicators)

### Keyboard Shortcuts

- `Ctrl/Cmd + K` - Open command palette
- `Ctrl/Cmd + P` - Quick project switch
- `Ctrl/Cmd + \` - Toggle sidebar
- `Ctrl/Cmd + J` - Toggle terminal
- `Esc` - Close modals/overlays

## Architecture

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: Zustand, SWR for server state
- **Real-time**: WebSocket connections, Server-Sent Events
- **Testing**: Jest, React Testing Library
- **Build Tools**: Turborepo, ESBuild

### Project Structure

```
apps/web/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/         # API routes
│   │   └── (routes)/    # Page components
│   ├── components/       # Reusable UI components
│   │   ├── ui/         # Base UI components
│   │   ├── workspace/  # Workspace-specific
│   │   └── scopecam/   # ScopeCam integration
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and helpers
│   │   ├── api/        # API clients
│   │   ├── security/   # Security utilities
│   │   └── scopecam/   # ScopeCam tools
│   ├── store/           # Zustand stores
│   └── types/           # TypeScript types
├── public/              # Static assets
├── tests/               # Test files
└── scripts/             # Build and utility scripts
```

### Data Flow

1. **User Interaction** → React Components
2. **State Updates** → Zustand Stores
3. **API Calls** → Next.js API Routes
4. **External Services** → Bridge API / MCP Servers
5. **Real-time Updates** → WebSocket Handlers
6. **UI Updates** → React Re-renders

### Security Architecture

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Transport**: HTTPS/WSS in production
- **Headers**: CSP, HSTS, X-Frame-Options
- **Input Validation**: Zod schemas
- **Rate Limiting**: Per-IP and per-user limits

## Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Run type checking in watch mode
npm run typecheck:watch

# Run linter
npm run lint

# Format code
npm run format
```

### Code Style

We use ESLint and Prettier for consistent code style:

```bash
# Check code style
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Git Hooks

Pre-commit hooks ensure code quality:

- Linting check
- Type checking
- Test execution
- Format verification

### Building

```bash
# Create production build
npm run build

# Analyze bundle size
npm run analyze

# Run production build locally
npm run start
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- components/Button.test.tsx
```

### Test Structure

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data
```

### Writing Tests

Example component test:

```typescript
import { render, screen } from '@testing-library/react'
import { ProjectChooser } from '@/components/project-chooser'

describe('ProjectChooser', () => {
  it('renders project list', () => {
    const projects = [
      { id: '1', name: 'Project A' },
      { id: '2', name: 'Project B' }
    ]
    
    render(<ProjectChooser projects={projects} />)
    
    expect(screen.getByText('Project A')).toBeInTheDocument()
    expect(screen.getByText('Project B')).toBeInTheDocument()
  })
})
```

## Security

### Security Features

1. **Authentication & Authorization**
   - JWT-based authentication
   - Refresh token rotation
   - Session management
   - Role-based permissions

2. **Input Validation**
   - Zod schema validation
   - Path traversal prevention
   - SQL injection protection
   - XSS prevention

3. **Security Headers**
   - Content Security Policy (CSP)
   - Strict Transport Security (HSTS)
   - X-Frame-Options
   - X-Content-Type-Options

4. **Rate Limiting**
   - Per-IP limits
   - Per-user limits
   - Endpoint-specific limits
   - DDoS protection

### Reporting Vulnerabilities

Please see our [Security Policy](SECURITY.md) for details on reporting vulnerabilities.

## API Reference

### REST Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Verify authentication

#### Projects
- `GET /api/projects` - List projects
- `POST /api/projects/scan` - Scan for projects
- `GET /api/projects/[id]` - Get project details

#### Agents
- `GET /api/projects/[id]/agents/status` - Agent status
- `POST /api/projects/[id]/agents/command` - Send command

#### Console
- `POST /api/projects/[id]/console/execute` - Execute command
- `GET /api/projects/[id]/console/output` - Get output

### WebSocket Events

#### Client → Server
- `authenticate` - Authenticate connection
- `subscribe` - Subscribe to updates
- `command` - Send agent command

#### Server → Client
- `agent_status_update` - Agent status change
- `console_output` - Command output
- `error` - Error notification

## Troubleshooting

### Common Issues

#### Dashboard Won't Start
1. Check Node.js version: `node --version` (requires 18.x or 20.x)
2. Clear cache: `rm -rf .next node_modules`
3. Reinstall: `npm install`
4. Check port: `lsof -ti:3000`

#### Connection Issues
1. Verify bridge server is running
2. Check WebSocket URL configuration
3. Inspect browser console for errors
4. Try standalone mode first

#### Project Not Detected
1. Ensure project has identifiable markers
2. Check detection paths configuration
3. Try manual project addition
4. Verify file permissions

#### Performance Issues
1. Enable production mode: `NODE_ENV=production`
2. Check browser dev tools performance tab
3. Monitor WebSocket message frequency
4. Review bundle size: `npm run analyze`

### Debug Mode

Enable detailed logging:

```bash
DEBUG=* npm run dev
```

### Support

- GitHub Issues: [Report bugs](https://github.com/happy-patterns-org/happy-observatory/issues)
- Documentation: [Full docs](https://docs.happypatterns.org)
- Community: [Discord server](https://discord.gg/happypatterns)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Next.js team for the amazing framework
- shadcn for the beautiful UI components
- The MCP protocol team for standardization
- All our contributors and users

---

*Happy Observatory - Empowering developers with intelligent automation*