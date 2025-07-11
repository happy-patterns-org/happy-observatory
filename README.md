# 🔭 Happy Observatory

A comprehensive dashboard, monitoring, and control plane for Happy-DevKit agentic development. Built as a monorepo with Next.js, TypeScript, and modern web technologies to provide real-time insights and control over autonomous development agents.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Development](#development)
- [Project Structure](#project-structure)
- [Applications](#applications)
- [Packages](#packages)
- [Configuration](#configuration)
- [API Integration](#api-integration)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

Happy Observatory serves as the central command center for the Happy-DevKit ecosystem, providing:

- **Real-time Monitoring** - Live dashboards showing agent activity, system health, and performance metrics
- **Agent Control** - Start, stop, configure, and orchestrate multiple autonomous agents
- **Project Management** - Discover, track, and manage development projects across your system
- **Test Orchestration** - Advanced testing capabilities through ScopeCam integration
- **Visual Workflow Design** - LangGraph composer for building agent workflows
- **Developer Experience** - Rich terminal UI and web-based console for all skill levels

### Key Benefits

1. **Unified Control Plane** - Single interface for all agent operations
2. **Real-time Insights** - WebSocket-based live updates and streaming data
3. **Enterprise Ready** - Built-in security, authentication, and audit logging
4. **Extensible Architecture** - Plugin system for custom integrations
5. **Developer Friendly** - Comprehensive APIs and documentation

## Architecture

```
happy-observatory/
├── apps/                       # Application packages
│   ├── web/                   # Next.js dashboard (Sunshine Nexus UI)
│   │   ├── src/              # Source code
│   │   ├── public/           # Static assets
│   │   └── tests/            # Test files
│   ├── cli/                   # Rich TUI console for terminal users
│   │   ├── src/              # CLI source
│   │   └── tests/            # CLI tests
│   └── api/                   # Backend for Frontend (BFF)
│       ├── src/              # API source
│       └── tests/            # API tests
├── packages/                   # Shared packages
│   ├── design-system/         # Sunshine Nexus Design System components
│   │   ├── components/       # React components
│   │   └── styles/           # Shared styles
│   ├── agent-client/          # TypeScript client for Happy-DevKit API
│   │   ├── src/              # Client source
│   │   └── types/            # TypeScript types
│   └── telemetry/             # Shared metrics & observability
│       ├── collectors/       # Metric collectors
│       └── exporters/        # Data exporters
├── docker/                     # Container definitions
│   ├── web.Dockerfile        # Web app container
│   ├── api.Dockerfile        # API container
│   └── docker-compose.yml    # Development setup
├── docs/                       # Documentation
│   ├── architecture/         # Architecture decisions
│   ├── api/                  # API documentation
│   └── guides/               # User guides
└── scripts/                    # Build and utility scripts
    ├── setup.sh              # Initial setup
    └── deploy.sh             # Deployment scripts
```

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Happy Observatory                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │   Web App   │  │   CLI App    │  │    API Server     │ │
│  │  (Next.js)  │  │   (Ink/TUI)  │  │   (FastAPI)       │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬─────────┘ │
│         │                 │                     │           │
│  ┌──────┴─────────────────┴────────────────────┴─────────┐ │
│  │              Shared Packages Layer                     │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │Design System│  │ Agent Client │  │  Telemetry   │ │ │
│  │  └─────────────┘  └──────────────┘  └──────────────┘ │ │
│  └────────────────────────┬──────────────────────────────┘ │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                    External Services
                            │
┌───────────────────────────┴─────────────────────────────────┐
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Happy-DevKit│  │ Bridge Server│  │   MCP Servers     │  │
│  │    APIs     │  │  (WebSocket) │  │  (Projects)       │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Core Features

#### 1. Real-time Agent Monitoring
- **Live Status Dashboard** - View all active agents and their current state
- **Performance Metrics** - CPU, memory, and task completion rates
- **Activity Timeline** - Historical view of agent operations
- **Alert System** - Configurable alerts for anomalies

#### 2. Agentic Control Plane
- **Agent Lifecycle Management** - Start, stop, pause, and restart agents
- **Configuration Management** - Dynamic agent configuration updates
- **Resource Allocation** - Manage compute resources per agent
- **Priority Queuing** - Task prioritization and scheduling

#### 3. Project Discovery & Management
- **Auto-Discovery** - Automatically find projects in common directories
- **Project Health** - Monitor build status, test results, and dependencies
- **MCP Integration** - Connect to project-specific MCP servers
- **Git Integration** - Track commits, branches, and pull requests

#### 4. ScopeCam Test Orchestration
- **Intelligent Test Selection** - AI-powered test prioritization
- **Failure Analysis** - Root cause analysis for test failures
- **Performance Tracking** - Test execution time trends
- **Coverage Mapping** - Visualize code coverage

#### 5. LangGraph Composer
- **Visual Workflow Builder** - Drag-and-drop agent workflow design
- **Template Library** - Pre-built workflow templates
- **Real-time Preview** - See workflow execution in real-time
- **Export/Import** - Share workflows between teams

#### 6. DevKit Console
- **Browser Terminal** - Full terminal emulation in the browser
- **Command History** - Persistent command history with search
- **Auto-completion** - Smart command suggestions
- **Multi-tab Support** - Multiple terminal sessions

#### 7. Telemetry Dashboard
- **OpenTelemetry Integration** - Standard observability framework
- **Custom Metrics** - Define and track custom metrics
- **Distributed Tracing** - Trace requests across services
- **Log Aggregation** - Centralized log viewing and search

### Advanced Features

#### Security & Compliance
- **JWT Authentication** - Secure token-based auth
- **Role-Based Access Control** - Fine-grained permissions
- **Audit Logging** - Complete audit trail of all actions
- **Encryption** - TLS for all communications

#### Integration Capabilities
- **REST API** - Comprehensive API for all operations
- **WebSocket Support** - Real-time bidirectional communication
- **Webhook System** - Event-driven integrations
- **Plugin Architecture** - Extend with custom functionality

#### Developer Experience
- **TypeScript Throughout** - Full type safety
- **Hot Module Replacement** - Fast development iteration
- **Storybook Integration** - Component documentation
- **API Documentation** - Auto-generated API docs

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS, CSS Modules
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: Zustand, SWR
- **Real-time**: WebSocket, Server-Sent Events
- **Animation**: Framer Motion
- **Charts**: Recharts, D3.js

### Backend
- **API Framework**: FastAPI (Python)
- **WebSocket**: Socket.IO
- **Database**: PostgreSQL, Redis
- **ORM**: SQLAlchemy
- **Task Queue**: Celery
- **Authentication**: JWT, OAuth2

### Infrastructure
- **Monorepo**: Turborepo
- **Package Manager**: npm/pnpm
- **Build Tools**: Vite, ESBuild
- **Testing**: Jest, Playwright, pytest
- **CI/CD**: GitHub Actions
- **Containerization**: Docker, Kubernetes
- **Monitoring**: OpenTelemetry, Prometheus

### Design System
- **Component Library**: Custom Sunshine Nexus system
- **Icons**: Lucide Icons
- **Typography**: Inter, JetBrains Mono
- **Theming**: CSS Variables, Dark mode support

## Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- Python 3.11+
- Docker (optional)
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/happy-patterns-org/happy-observatory.git
cd happy-observatory

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development servers (all apps)
npm run dev

# Or start specific apps
npm run dev:web    # Just the web dashboard
npm run dev:cli    # Just the CLI
npm run dev:api    # Just the API server
```

### Production Build

```bash
# Build all applications
npm run build

# Build specific apps
npm run build:web
npm run build:cli
npm run build:api

# Start production servers
npm run start
```

### Docker Setup

```bash
# Build containers
docker-compose build

# Start services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f
```

## Development

### Development Workflow

1. **Feature Branches** - Create feature branches from `main`
2. **Conventional Commits** - Use conventional commit format
3. **Code Review** - All PRs require review
4. **Testing** - Write tests for new features
5. **Documentation** - Update docs with changes

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Lint all code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run specific app tests
npm run test:web
npm run test:cli
npm run test:api
```

### Building Components

```bash
# Start Storybook for component development
npm run storybook

# Build Storybook
npm run build:storybook
```

## Project Structure

### Web Application (`apps/web`)

The main dashboard application built with Next.js 14:

- **Pages** - App Router pages and layouts
- **Components** - React components organized by feature
- **Hooks** - Custom React hooks
- **Lib** - Utilities and business logic
- **API Routes** - Backend API endpoints

### CLI Application (`apps/cli`)

Rich terminal interface for power users:

- **Commands** - CLI command implementations
- **UI Components** - Ink-based UI components
- **Utils** - CLI utilities and helpers

### API Server (`apps/api`)

FastAPI backend server:

- **Routers** - API endpoint definitions
- **Services** - Business logic layer
- **Models** - Database models
- **WebSocket** - Real-time handlers

## Configuration

### Environment Variables

```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Database
DATABASE_URL=postgresql://user:pass@localhost/observatory

# Redis
REDIS_URL=redis://localhost:6379

# External Services
HAPPY_DEVKIT_API=http://localhost:8000
BRIDGE_WS_URL=ws://localhost:52521

# Telemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=happy-observatory

# Feature Flags
ENABLE_LANGRAPH_COMPOSER=true
ENABLE_SCOPECAM=true
```

### Configuration Files

- `turbo.json` - Turborepo configuration
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.js` - ESLint rules
- `prettier.config.js` - Prettier formatting
- `jest.config.js` - Jest testing setup

## API Integration

### Happy-DevKit Connection

The observatory connects to Happy-DevKit via:

```typescript
// REST API
const client = new HappyDevKitClient({
  baseURL: process.env.HAPPY_DEVKIT_API,
  auth: { token: process.env.API_TOKEN }
})

// WebSocket
const ws = new WebSocket(process.env.BRIDGE_WS_URL)
ws.on('agent_update', (data) => {
  // Handle real-time updates
})

// MCP Protocol
const mcp = new MCPClient({
  project: selectedProject,
  tools: ['test_runner', 'code_analyzer']
})
```

### API Endpoints

Key API endpoints:

- `GET /api/agents` - List all agents
- `POST /api/agents/:id/start` - Start an agent
- `GET /api/projects` - List projects
- `POST /api/projects/scan` - Scan for projects
- `WS /ws/agents` - Agent status WebSocket
- `WS /ws/telemetry` - Metrics WebSocket

## Security

### Security Features

1. **Authentication**
   - JWT-based authentication
   - Refresh token rotation
   - Session management
   - OAuth2 integration

2. **Authorization**
   - Role-based access control
   - Resource-level permissions
   - API key management
   - Token revocation

3. **Transport Security**
   - HTTPS enforcement
   - WSS for WebSockets
   - Certificate pinning
   - CORS configuration

4. **Data Protection**
   - Encryption at rest
   - Input validation
   - SQL injection prevention
   - XSS protection

### Security Headers

```typescript
// Content Security Policy
CSP: "default-src 'self'; script-src 'self' 'nonce-{nonce}'"

// Additional headers
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## Testing

### Test Structure

```
tests/
├── unit/          # Unit tests
├── integration/   # Integration tests
├── e2e/          # End-to-end tests
└── performance/  # Performance tests
```

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires running app)
npm run test:e2e

# Performance tests
npm run test:perf

# All tests with coverage
npm run test:all
```

### Writing Tests

Example test:

```typescript
// Component test
describe('AgentDashboard', () => {
  it('displays agent status correctly', () => {
    const agents = [
      { id: '1', name: 'Agent 1', status: 'running' }
    ]
    
    render(<AgentDashboard agents={agents} />)
    
    expect(screen.getByText('Agent 1')).toBeInTheDocument()
    expect(screen.getByText('running')).toBeInTheDocument()
  })
})
```

## Deployment

### Production Deployment

1. **Build the applications**:
   ```bash
   npm run build
   ```

2. **Run database migrations**:
   ```bash
   npm run migrate:prod
   ```

3. **Start the services**:
   ```bash
   npm run start:prod
   ```

### Docker Deployment

```bash
# Build production images
docker build -f docker/web.Dockerfile -t observatory-web .
docker build -f docker/api.Dockerfile -t observatory-api .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up
```

### Kubernetes Deployment

```bash
# Apply configurations
kubectl apply -f k8s/

# Check status
kubectl get pods -n happy-observatory

# View logs
kubectl logs -f deployment/observatory-web
```

### Environment-Specific Configs

- **Development**: `.env.development`
- **Staging**: `.env.staging`
- **Production**: `.env.production`

## Monitoring

### Observability Stack

1. **Metrics**: Prometheus + Grafana
2. **Tracing**: Jaeger
3. **Logging**: ELK Stack
4. **Uptime**: Uptime Kuma

### Key Metrics

- Agent activity and performance
- API response times
- WebSocket connection health
- Error rates and types
- Resource utilization

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Write meaningful commit messages
- Include tests for new features
- Update documentation
- Ensure CI passes

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Clear caches
rm -rf .next node_modules
npm install
npm run dev
```

#### WebSocket Connection Failed
- Check Bridge server is running
- Verify WebSocket URL configuration
- Check firewall settings

#### Build Errors
```bash
# Clean build
npm run clean
npm run build
```

### Debug Mode

Enable debug logging:

```bash
# Frontend debugging
DEBUG=observatory:* npm run dev

# API debugging
LOG_LEVEL=debug npm run dev:api
```

### Getting Help

- 📚 [Documentation](https://docs.happypatterns.org)
- 💬 [Discord Community](https://discord.gg/happypatterns)
- 🐛 [Issue Tracker](https://github.com/happy-patterns-org/happy-observatory/issues)
- 📧 [Email Support](mailto:support@happypatterns.org)

## Roadmap

### Q1 2025
- [ ] Multi-agent orchestration
- [ ] Advanced workflow templates
- [ ] Mobile responsive design
- [ ] Plugin marketplace

### Q2 2025
- [ ] AI-powered insights
- [ ] Distributed agent support
- [ ] Enhanced security features
- [ ] Enterprise features

### Future
- [ ] Cloud-hosted version
- [ ] Multi-tenancy support
- [ ] Advanced analytics
- [ ] ML model integration

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Next.js team for the amazing framework
- Radix UI for accessible components
- The Happy-DevKit community
- All our contributors

---

**Happy Observatory** - Empowering developers with intelligent agent orchestration 🚀

*Part of the Happy Patterns ecosystem*