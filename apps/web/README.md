# Happy Observatory Dashboard

## Overview

The Happy Observatory is a fully integrated dashboard workspace that provides:

- **Unified Dashboard Layout** - Clean, modern interface with header and sidebar navigation
- **Project Awareness** - Select and manage multiple development projects
- **Auto-Detection** - Automatically discover local development projects
- **Real-time Metrics** - Monitor agent activity, system health, and project status
- **ScopeCam Integration** - Special features for test orchestration projects

## Key Features

### 1. Project Management
- **Project Chooser** (top-right) - Select active project or add new ones
- **Auto-detect Projects** - Scans common development directories
- **MCP Server Detection** - Automatically connects to project MCP servers

### 2. Dashboard Views
- **Activity Monitor** - Default view with agent metrics and system health
- **Agent Console** - Monitor and control active agents
- **Git Operations** - Git integration (coming soon)
- **Analytics** - Deep insights into agent performance (coming soon)

### 3. ScopeCam Projects
When a ScopeCam project is detected, additional views become available:
- **Test Dashboard** - Comprehensive test orchestration metrics
- **Shell Terminal** - Execute ScopeCam commands directly

### 4. Real-time Monitoring
- Agent activity tracking
- Task completion metrics
- System resource usage
- Connection status indicators
- Activity feed with recent events

## Usage

### With Real Data (via Bridge Server)
1. **Start bridge server**: In Happy DevKit: `./scripts/dashboard-bridge-server.py`
2. **Start dashboard**: `npm run dev`
3. **Open browser**: http://localhost:3000
4. **Add projects** and monitor real agent activity

### Standalone Mode (Mock Data)
1. **Start dashboard**: `npm run dev`
2. **Open browser**: http://localhost:3000
3. Works with simulated data (yellow indicators show mocked data)

## Architecture

The dashboard integrates seamlessly with:
- MCP servers for agent communication
- ScopeCam test orchestration tools
- Real-time WebSocket connections
- Persistent project state management

## Auto-Detection

The system looks for projects in common development directories:
- `~/Development`
- `~/Projects`
- `~/dev`
- `~/workspace`
- `~/code`

Projects are identified by:
- Git repositories
- package.json files
- MCP server configurations
- Python projects (requirements.txt)

## Connection Status

The sidebar shows real-time connection status:
- 🟢 Connected - Active MCP server connection
- 🟡 Connecting - Establishing connection
- 🔴 Disconnected - No active connection

Last activity time is displayed to track agent responsiveness.