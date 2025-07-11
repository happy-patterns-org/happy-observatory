# Happy Observatory Architecture

## Overview

Happy Observatory is a Next.js 14 application that provides a unified interface for managing development projects, integrating with Model Context Protocol (MCP) servers, and orchestrating autonomous agents. Built with TypeScript and designed for real-time monitoring and control.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │   Next.js   │  │   Zustand    │  │   TailwindCSS     │  │
│  │  App Router │  │ State Mgmt   │  │   + shadcn/ui     │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS/WSS
┌─────────────────────────┴───────────────────────────────────┐
│                    API Layer (Next.js)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  REST APIs  │  │  WebSocket   │  │   Middleware      │  │
│  │  /api/*     │  │   Handlers   │  │  (Auth, CSP)      │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                    External Services                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Bridge API  │  │  MCP Servers │  │   ScopeCam MCP    │  │
│  │  (Agents)   │  │  (Projects)  │  │   (Testing)       │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Frontend Architecture

#### Pages (App Router)
- `/` - Landing page with project overview
- `/workspace` - Main workspace interface
- `/login` - Authentication page
- `/claude-collab` - Claude collaboration interface

#### State Management
- **Zustand** for global state
- **SWR** for server state and caching
- **React Context** for theme and auth

#### UI Components
- **shadcn/ui** - Headless component library
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible primitives
- **Lucide Icons** - Icon system

### 2. API Architecture

#### REST Endpoints
```
/api/
├── auth/
│   ├── login/      # JWT authentication
│   ├── logout/     # Session termination
│   └── check/      # Auth validation
├── projects/
│   ├── [projectId]/
│   │   ├── agents/    # Agent control
│   │   ├── console/   # Command execution
│   │   └── telemetry/ # Metrics collection
│   ├── scan/          # Project discovery
│   └── check-*/       # Various checks
├── mcp/
│   └── connect/    # MCP server connections
└── health/         # System health check
```

#### WebSocket Connections
- Real-time agent status updates
- Live console output streaming
- Telemetry data broadcasting
- MCP server event streaming

### 3. Security Architecture

#### Authentication
- JWT-based authentication
- Refresh token rotation
- Secure httpOnly cookies
- Session management

#### Authorization
- Role-based access control (RBAC)
- Project-level permissions
- API endpoint protection
- WebSocket authentication

#### Security Headers
- Content Security Policy (CSP) with nonces
- CORS configuration
- Rate limiting
- Input validation with Zod

### 4. Integration Architecture

#### MCP (Model Context Protocol)
```typescript
interface MCPIntegration {
  detection: 'Automatic via mcp.json scanning'
  connection: 'WebSocket or stdio transport'
  tools: 'Dynamic tool discovery'
  events: 'Real-time event streaming'
}
```

#### Bridge API Integration
- Shared configuration from `@business-org/shared-config-ts`
- WebSocket message protocol
- Agent lifecycle management
- Distributed command execution

#### ScopeCam Integration
- Test orchestration tools
- Performance tracking
- Coverage analysis
- Flaky test detection

## Data Flow

### 1. Project Discovery Flow
```
User Request → API scan → File System → Project Detection → 
MCP Discovery → Database Update → UI Update
```

### 2. Agent Command Flow
```
UI Command → API Validation → Bridge WebSocket → 
Agent Execution → Status Updates → UI Feedback
```

### 3. MCP Tool Execution Flow
```
Tool Request → MCP Client → Server Connection → 
Tool Execution → Result Processing → UI Display
```

## Key Design Patterns

### 1. Adapter Pattern
- `config-adapter.ts` bridges shared config with local needs
- Maintains backward compatibility
- Centralizes configuration mapping

### 2. Repository Pattern
- Consistent data access layer
- Abstraction over data sources
- Testable data operations

### 3. Observer Pattern
- WebSocket event handling
- Real-time state synchronization
- Pub/sub for component updates

### 4. Middleware Pattern
- Authentication checking
- Request validation
- Error handling
- Logging and monitoring

## Technology Stack

### Core
- **Next.js 14.2.5** - React framework
- **TypeScript 5.x** - Type safety
- **React 18.x** - UI library
- **Node.js 18/20** - Runtime

### State & Data
- **Zustand** - Client state
- **SWR** - Data fetching
- **Zod** - Schema validation

### Development
- **Jest** - Testing framework
- **ESLint** - Code quality
- **Prettier** - Code formatting
- **Husky** - Git hooks

### Infrastructure
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **Turborepo** - Monorepo management

## Performance Considerations

### 1. Optimization Strategies
- Route-based code splitting
- Dynamic imports for heavy components
- Image optimization with Next.js Image
- API response caching with SWR

### 2. Caching Layers
- Browser cache for static assets
- SWR cache for API responses
- WebSocket connection pooling
- MCP connection reuse

### 3. Monitoring
- Performance metrics collection
- Error tracking and reporting
- Resource usage monitoring
- Real-time alerting

## Scalability

### Horizontal Scaling
- Stateless API design
- WebSocket connection distribution
- Load balancer compatible
- Shared session storage

### Vertical Scaling
- Efficient memory usage
- Optimized database queries
- Background job processing
- Resource pooling

## Security Measures

### Input Validation
- Zod schemas for all inputs
- Path traversal prevention
- SQL injection protection
- XSS prevention

### Authentication Flow
```
Login → JWT Generation → Cookie Storage → 
Request Validation → Resource Access
```

### Rate Limiting
- IP-based limiting
- User-based quotas
- Endpoint-specific limits
- WebSocket connection limits

## Development Workflow

### Local Development
```bash
npm install          # Install dependencies
npm run dev         # Start dev server
npm test           # Run tests
npm run build      # Production build
```

### Environment Configuration
- `.env.local` for local development
- `.env.production` for production
- `.env.test` for testing

### Code Organization
```
src/
├── app/            # Next.js pages and API routes
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks
├── lib/            # Business logic and utilities
├── store/          # Zustand state stores
└── types/          # TypeScript type definitions
```

## Testing Strategy

### Unit Tests
- Component testing with React Testing Library
- Hook testing with renderHook
- Utility function testing
- API endpoint testing

### Integration Tests
- API integration tests
- WebSocket connection tests
- MCP server integration tests
- End-to-end user flows

### Performance Tests
- Load testing for API endpoints
- WebSocket connection limits
- Memory usage profiling
- Response time benchmarks

## Deployment Architecture

### Build Process
1. TypeScript compilation
2. Next.js optimization
3. Asset bundling
4. Docker image creation

### Deployment Targets
- Kubernetes clusters
- Docker Swarm
- Standalone containers
- Serverless platforms

### Health Checks
- `/api/health` endpoint
- WebSocket connectivity
- External service checks
- Database connectivity

## Maintenance

### Logging
- Structured logging with context
- Error tracking with stack traces
- Performance metrics logging
- Audit trail for sensitive operations

### Monitoring
- Application Performance Monitoring (APM)
- Real User Monitoring (RUM)
- Infrastructure monitoring
- Custom business metrics

### Updates
- Dependency updates via Dependabot
- Security patches priority
- Feature deprecation notices
- Migration guides

## Future Considerations

### Planned Enhancements
1. GraphQL API layer
2. Enhanced caching strategies
3. Microservices architecture
4. Event-driven architecture

### Technical Debt
1. Legacy endpoint migration
2. Test coverage improvement
3. Performance optimization
4. Documentation updates

---

*This architecture document is maintained as part of the Happy Observatory project. Last updated: January 2025*