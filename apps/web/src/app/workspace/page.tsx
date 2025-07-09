'use client'

import { useState, useEffect, useCallback } from 'react'
import { WorkspaceLayout } from '@/components/workspace/workspace-layout'
import { WorkspaceMode } from '@/components/workspace/workspace-mode'
import { NexusConsole } from '@/components/workspace/nexus-console'
import { SolarProgressIndicator } from '@/components/workspace/solar-progress'
import { useProjectStore } from '@/store/project-store'
import { detectMCPServer, connectToMCPServer } from '@/lib/mcp-detector-enhanced'
import { useProjectWebSocket } from '@/hooks/use-project-websocket'
import { useProjectApi } from '@/lib/api/project-client'
import { AgentStatusMonitor } from '@/components/agent-status-monitor'
import { DashboardMetrics } from '@/components/dashboard-metrics'
import { TestDashboard } from '@/components/scopecam/test-dashboard'
import { ScopeCamMCPConnection, ScopeCamProject } from '@/lib/scopecam/mcp-connection'

type OperatingMode = 'observe' | 'guide' | 'collaborate' | 'autonomous'

export default function WorkspacePage() {
  const { selectedProject, updateProject, updateAgentActivity } = useProjectStore()
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('observe')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [consoleCollapsed, setConsoleCollapsed] = useState(false)
  const [mcpConnection, setMcpConnection] = useState<any>(null)
  const [isScopeCamProject, setIsScopeCamProject] = useState(false)

  // Project-scoped API client
  const projectApi = useProjectApi(selectedProject?.id)

  // Project-scoped WebSocket connection for real-time updates
  const { isConnected: wsConnected, connectionError: wsError } = useProjectWebSocket({
    onTelemetry: (data) => {
      console.log('Received telemetry update:', data)
    },
    onAgentStatus: (data) => {
      console.log('Received agent status update:', data)
      // Agent activity is automatically updated in the hook
    },
    onError: (error) => {
      console.error('WebSocket error:', error)
    },
    autoConnect: true,
  })

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Mode switching: Cmd/Ctrl + 1-4
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case '1':
            setOperatingMode('observe')
            break
          case '2':
            setOperatingMode('guide')
            break
          case '3':
            setOperatingMode('collaborate')
            break
          case '4':
            setOperatingMode('autonomous')
            break
          case 'b':
            setSidebarCollapsed((prev) => !prev)
            break
          case '`':
            setConsoleCollapsed((prev) => !prev)
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle project changes
  useEffect(() => {
    if (selectedProject) {
      const isScopeCam = selectedProject.name.toLowerCase().includes('scopecam')
      setIsScopeCamProject(isScopeCam)

      if (selectedProject.hasSubmoduleMCP && selectedProject.mcpServerUrl) {
        handleMCPConnection(selectedProject.mcpServerUrl, isScopeCam)
      } else {
        detectAndConnect()
      }
    }
  }, [selectedProject])

  async function detectAndConnect() {
    if (!selectedProject) return

    try {
      const mcpInfo = await detectMCPServer(selectedProject.path)
      if (mcpInfo.isAvailable && mcpInfo.serverUrl) {
        updateProject(selectedProject.id, {
          hasSubmoduleMCP: true,
          mcpServerUrl: mcpInfo.serverUrl,
        })
        await handleMCPConnection(mcpInfo.serverUrl, isScopeCamProject)
      }
    } catch (error) {
      console.error('Failed to detect MCP server:', error)
    }
  }

  async function handleMCPConnection(serverUrl: string, isScopeCam: boolean) {
    if (!selectedProject) return

    try {
      let connection
      if (isScopeCam) {
        const scopeCamProject: ScopeCamProject = {
          ...selectedProject,
          scopecamEnabled: true,
          mcpServerUrl: serverUrl,
        }
        connection = new ScopeCamMCPConnection(
          scopeCamProject,
          (message) => {
            if (message.type === 'agent-activity') {
              updateAgentActivity(selectedProject.id, message.data)
            }
          },
          console.error
        )
        await connection.connect()
      } else {
        connection = await connectToMCPServer(selectedProject, (message) => {
          if (message.type === 'agent-activity') {
            updateAgentActivity(selectedProject.id, message.data)
          }
        })
      }
      setMcpConnection(connection)
    } catch (error) {
      console.error('MCP connection failed:', error)
    }
  }

  const getModeContent = () => {
    switch (operatingMode) {
      case 'observe':
        return <DashboardMetrics />

      case 'guide':
        return <AgentStatusMonitor />

      case 'collaborate':
        if (isScopeCamProject && selectedProject) {
          const scopeCamProject: ScopeCamProject = {
            ...selectedProject,
            scopecamEnabled: true,
            mcpServerUrl: selectedProject.mcpServerUrl || '',
          }
          return <TestDashboard project={scopeCamProject} mcpConnection={mcpConnection} />
        }
        return <DashboardMetrics />

      case 'autonomous':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <SolarProgressIndicator mode="autonomous" />
              <p className="mt-4 text-stone-600">Autonomous mode active</p>
              <p className="text-sm text-stone-500 mt-2">Agents operating independently</p>
            </div>
          </div>
        )

      default:
        return <DashboardMetrics />
    }
  }

  return (
    <WorkspaceLayout
      sidebarCollapsed={sidebarCollapsed}
      onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      consoleCollapsed={consoleCollapsed}
      selectedProject={selectedProject}
    >
      <div className="flex flex-col h-full">
        {/* Mode Selector */}
        <WorkspaceMode currentMode={operatingMode} onModeChange={setOperatingMode} />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6">{getModeContent()}</div>

        {/* Nexus Console */}
        <NexusConsole
          collapsed={consoleCollapsed}
          onToggle={() => setConsoleCollapsed(!consoleCollapsed)}
          projectPath={selectedProject?.path}
        />
      </div>
    </WorkspaceLayout>
  )
}
