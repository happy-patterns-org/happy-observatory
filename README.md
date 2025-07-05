# 🔭 Happy Observatory

Dashboard, monitoring, and control plane for Happy-DevKit agentic development.

## Architecture

```
happy-observatory/
├── apps/
│   ├── web/               # Next.js dashboard (Sunshine Nexus UI)
│   ├── cli/               # Rich TUI console for terminal users
│   └── api/               # Backend for Frontend (BFF)
├── packages/
│   ├── design-system/     # Sunshine Nexus Design System components
│   ├── agent-client/      # TypeScript client for Happy-DevKit API
│   └── telemetry/         # Shared metrics & observability
└── docker/                # Container definitions
```

## Features

- **Real-time Agent Monitoring**: Live status and metrics for all agents
- **Agentic Control Plane**: Start, stop, and configure agents
- **LangGraph Composer**: Visual workflow builder
- **DevKit Console**: Terminal-in-browser with full CLI capabilities
- **Telemetry Dashboard**: OpenTelemetry integration with traces and metrics

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python), WebSockets
- **Design System**: Radix UI, Framer Motion
- **Monorepo**: Turborepo, NPM Workspaces
- **Observability**: OpenTelemetry, Prometheus

## Getting Started

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Build for production
npm run build
```

## Connection to Happy-DevKit

This observatory connects to Happy-DevKit's API layer via:
- REST API for configuration and control
- WebSocket for real-time updates
- MCP (Model Context Protocol) for agent communication

## License

MIT
