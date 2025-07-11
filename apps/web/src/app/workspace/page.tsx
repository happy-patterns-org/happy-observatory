'use client'

import { AgentStatusMonitor } from '@/components/agent-status-monitor'
import { DashboardMetrics } from '@/components/dashboard-metrics'
import { TestDashboard } from '@/components/scopecam/test-dashboard'
import { NexusConsole } from '@/components/workspace/nexus-console'
import { SolarProgressIndicator } from '@/components/workspace/solar-progress'
import { WorkspaceLayout } from '@/components/workspace/workspace-layout'
import { WorkspaceMode } from '@/components/workspace/workspace-mode'
import config from '@/config-adapter'
import { useProjectWebSocket } from '@/hooks/use-project-websocket'
import { logger } from '@/lib/logger-client'
import { connectToMCPServer, detectMCPServer } from '@/lib/mcp-detector-enhanced'
import { ScopeCamMCPConnection, type ScopeCamProject } from '@/lib/scopecam/mcp-connection'
import { isValidMCPServerUrl } from '@/lib/validation'
import { useProjectStore } from '@/store/project-store'
import { useEffect, useRef, useState } from 'react'

type OperatingMode = 'observe' | 'guide' | 'collaborate' | 'autonomous'

export default function WorkspacePage() {
  const { selectedProject, updateProject, updateAgentActivity } = useProjectStore()
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('observe')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [consoleCollapsed, setConsoleCollapsed] = useState(false)
  const [mcpConnection, setMcpConnection] = useState<any>(null)
  const [isScopeCamProject, setIsScopeCamProject] = useState(false)
  const [, setIsConnecting] = useState(false)


  // Project-scoped WebSocket connection for real-time updates
  useProjectWebSocket({
    autoConnect: false, // Disable auto-connect to prevent conflicts with MCP connection
    onTelemetry: (data) => {
      logger.debug('Received telemetry update', { data })
    },
    onAgentStatus: (data) => {
      logger.debug('Received agent status update', { data })
      // Agent activity is automatically updated in the hook
    },
    onError: (error) => {
      logger.error('WebSocket error', error as Error)
    },
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

  // Handle project changes - using ref to track connection state
  const connectionStateRef = useRef<{
    projectId?: string
    isConnecting: boolean
    connection: any
  }>({
    isConnecting: false,
    connection: null,
  })

  useEffect(() => {
    // Prevent multiple simultaneous connections
    if (connectionStateRef.current.isConnecting) return

    // Clean up existing connection when project changes
    if (
      connectionStateRef.current.connection &&
      selectedProject?.id !== connectionStateRef.current.projectId
    ) {
      const conn = connectionStateRef.current.connection
      if (typeof conn.disconnect === 'function') {
        conn.disconnect()
      } else if (typeof conn.close === 'function') {
        conn.close()
      }
      connectionStateRef.current.connection = null
      setMcpConnection(null)
    }

    if (selectedProject) {
      connectionStateRef.current.projectId = selectedProject.id
      const isScopeCam = selectedProject.name.toLowerCase().includes('scopecam')
      setIsScopeCamProject(isScopeCam)

      const performConnection = async () => {
        connectionStateRef.current.isConnecting = true
        setIsConnecting(true)

        try {
          if (selectedProject.hasSubmoduleMCP && selectedProject.mcpServerUrl) {
            // Check if mcpServerUrl is a valid string
            if (typeof selectedProject.mcpServerUrl === 'string') {
              await handleMCPConnection(selectedProject.mcpServerUrl, isScopeCam)
            } else {
              logger.error('Project has invalid mcpServerUrl', new Error('Invalid URL type'), {
                mcpServerUrl: selectedProject.mcpServerUrl,
              })
              // Try to detect MCP server again
              await detectAndConnect()
            }
          } else {
            await detectAndConnect()
          }
        } finally {
          connectionStateRef.current.isConnecting = false
          setIsConnecting(false)
        }
      }

      performConnection()
    }

    return () => {
      // Cleanup on unmount
      if (connectionStateRef.current.connection) {
        const conn = connectionStateRef.current.connection
        if (typeof conn.disconnect === 'function') {
          conn.disconnect()
        } else if (typeof conn.close === 'function') {
          conn.close()
        }
      }
    }
  }, [selectedProject?.id]) // Only re-run when project ID changes

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
      } else {
        logger.info('No MCP server detected for project', {
          message: 'Ensure the bridge server is running',
          bridgeServerUrl: config.bridgeServerUrl,
        })
      }
    } catch (error) {
      logger.error('Failed to detect MCP server', error as Error)
    }
  }

  async function handleMCPConnection(serverUrl: string, isScopeCam: boolean) {
    if (!selectedProject) return

    // Ensure serverUrl is a string and not an object
    if (typeof serverUrl !== 'string') {
      logger.error('MCP server URL must be a string', new Error('Invalid type'), {
        type: typeof serverUrl,
        serverUrl,
      })
      return
    }

    // Validate MCP server URL before attempting connection
    if (!serverUrl || !isValidMCPServerUrl(serverUrl)) {
      logger.warn('Invalid or missing MCP server URL', { serverUrl })
      return
    }

    try {
      let connection: any
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
          (error: any) => logger.error('ScopeCam connection error', error)
        )
        await connection.connect()
      } else {
        connection = await connectToMCPServer(selectedProject, (message) => {
          if (message.type === 'agent-activity') {
            updateAgentActivity(selectedProject.id, message.data)
          }
        })
      }
      // Add projectId to connection for cleanup tracking
      if (connection) {
        connection.projectId = selectedProject.id
        connectionStateRef.current.connection = connection
      }
      setMcpConnection(connection)
    } catch (error) {
      logger.error('MCP connection failed', error as Error)
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
          {...(selectedProject?.path && { projectPath: selectedProject.path })}
        />
      </div>
    </WorkspaceLayout>
  )
}
