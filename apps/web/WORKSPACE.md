# Happy Observatory Workspace

## Overview

The Happy Observatory Workspace is a comprehensive control center for agentic development, featuring the complete Sunshine Nexus design system with project awareness capabilities.

## Key Features

### 1. Four Operating Modes
Switch between modes using keyboard shortcuts (⌘1-4 or Ctrl+1-4):

- **Observe Mode** (⌘1) - Monitor agent activity and system metrics
- **Guide Mode** (⌘2) - Direct and guide agent operations
- **Collaborate Mode** (⌘3) - Work alongside agents on tasks
- **Autonomous Mode** (⌘4) - Agents operate independently

### 2. Collapsible Interface Elements
- **Sidebar** - Toggle with ⌘B or click the chevron
- **DevKit Console** - Toggle with ⌘` or click the chevron
- Both elements animate smoothly and remember their state

### 3. Project Awareness
- **Project Chooser** in the header for quick project switching
- **Auto-detect Projects** feature to discover local development projects
- **MCP Server Integration** - Automatic connection to project MCP servers
- **ScopeCam Support** - Special features for test orchestration projects

### 4. DevKit Console
- Full command-line interface at the bottom of the workspace
- Command history (use ↑/↓ arrows)
- Built-in commands:
  - `help` - Show available commands
  - `clear` - Clear console history
  - `status` - Show agent status
  - `project` - Show current project info
  - `mcp` - Show MCP connection status
  - `git` - Git operations
  - `test` - Run tests (ScopeCam projects)

### 5. Solar Progression Indicators
- Visual autonomy level indicators
- Animated solar system representing agent independence
- Mode-specific color schemes following dawn → morning → noon → twilight

### 6. Keyboard Shortcuts
- **⌘1-4** - Switch operating modes
- **⌘B** - Toggle sidebar
- **⌘`** - Toggle console
- **↑/↓** - Navigate command history in console

## Architecture

The workspace integrates:
- **Sunshine Nexus Design System** - Complete color palette and animations
- **Project Management** - Persistent project state with Zustand
- **MCP Integration** - Real-time agent communication
- **ScopeCam Tools** - 7 intelligent test orchestration tools
- **Responsive Layout** - Collapsible panels and adaptive content

## Usage

1. Navigate to `/workspace` (or visit root URL which redirects)
2. Select or add a project using the Project Chooser
3. Choose your operating mode based on your workflow
4. Use the DevKit console for direct command execution
5. Monitor agent activity in real-time

## Color Themes

The workspace uses the Sunshine Nexus solar progression theme:
- **Dawn** (blue/purple) - Observe mode
- **Morning** (yellow/amber) - Guide mode  
- **Noon** (orange) - Collaborate mode
- **Twilight** (pink/magenta) - Autonomous mode

Each mode represents increasing agent autonomy, from passive observation to full independence.