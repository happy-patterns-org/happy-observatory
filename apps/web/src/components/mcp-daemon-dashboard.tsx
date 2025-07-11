'use client'

import { logger } from '@/lib/logger-client'
import { getMCPDaemonClient } from '@/lib/mcp-daemon-client'
import type {
  AgentStatus,
  DaemonCapability,
  DaemonMetrics,
  DaemonStatus,
} from '@/lib/mcp-daemon-client'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Command,
  Cpu,
  HardDrive,
  Play,
  RefreshCw,
  Terminal,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from './error-fallback'

function MCPDaemonDashboardContent() {
  const [daemonStatus, setDaemonStatus] = useState<DaemonStatus | null>(null)
  const [metrics, setMetrics] = useState<DaemonMetrics | null>(null)
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [capabilities, setCapabilities] = useState<DaemonCapability[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [commandInput, setCommandInput] = useState('')
  const [commandOutput, setCommandOutput] = useState<string[]>([])

  const client = getMCPDaemonClient()

  // Fetch all data
  const fetchData = async () => {
    try {
      const [status, metricsData, agentData, caps] = await Promise.all([
        client.checkDaemonStatus(),
        client.getMetrics(),
        client.getAgentStatus(),
        client.getCapabilities(),
      ])

      setDaemonStatus(status)
      setMetrics(metricsData)
      setAgents(agentData)
      setCapabilities(caps)
    } catch (error) {
      logger.error('Failed to fetch daemon data', error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000) // Poll every 10s

    return () => clearInterval(interval)
  }, [])

  // WebSocket connection for real-time updates
  useEffect(() => {
    const disconnect = client.connectWebSocket(
      (data) => {
        logger.info('Received daemon update', data)

        if (data.type === 'agent_status') {
          setAgents(data.agents)
        } else if (data.type === 'metrics') {
          setMetrics(data.metrics)
        } else if (data.type === 'command_output') {
          setCommandOutput((prev) => [...prev, data.output])
        }
      },
      (error) => {
        logger.error('Daemon WebSocket error', error)
      }
    )

    return disconnect
  }, [])

  const executeCommand = async () => {
    if (!commandInput.trim()) return

    try {
      setCommandOutput((prev) => [...prev, `> ${commandInput}`])

      const result = await client.executeConsoleCommand(commandInput)
      setCommandOutput((prev) => [...prev, result.output || 'Command executed'])

      setCommandInput('')
    } catch (error) {
      setCommandOutput((prev) => [...prev, `Error: ${error}`])
    }
  }

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!daemonStatus?.daemon_running) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">MCP Daemon Not Running</h3>
        <p className="text-red-700">The MCP daemon is not currently running on port 8090.</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <h2 className="text-xl font-semibold text-purple-900">MCP Daemon Status</h2>
          </div>
          <button
            onClick={fetchData}
            className="p-2 hover:bg-purple-100 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-purple-600" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Version</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{daemonStatus.version}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Uptime</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {formatUptime(daemonStatus.uptime)}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">CPU Usage</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {metrics?.cpu_usage.toFixed(1) || 0}%
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Memory</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {metrics?.memory_usage.toFixed(0) || 0} MB
            </p>
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">MCP Tools Available</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map((cap) => (
            <button
              key={cap.tool}
              onClick={() => setSelectedTool(cap.tool)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                selectedTool === cap.tool
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Command className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-gray-900">{cap.tool}</h4>
              </div>
              <p className="text-sm text-gray-600">{cap.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Agent Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Status</h3>
        <div className="space-y-3">
          {agents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No active agents</p>
          ) : (
            agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {agent.status === 'running' ? (
                    <Activity className="w-5 h-5 text-green-600 animate-pulse" />
                  ) : agent.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{agent.name}</h4>
                    {agent.current_task && (
                      <p className="text-sm text-gray-600">{agent.current_task}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(agent.last_activity).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Console */}
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-100">MCP Console</h3>
        </div>

        <div className="bg-black rounded p-4 h-64 overflow-y-auto mb-4 font-mono text-sm">
          {commandOutput.length === 0 ? (
            <p className="text-gray-500">Ready for commands...</p>
          ) : (
            commandOutput.map((line, i) => (
              <div key={i} className="text-green-400">
                {line}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
            placeholder="Enter MCP command..."
            className="flex-1 bg-gray-800 text-gray-100 px-4 py-2 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={executeCommand}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Execute
          </button>
        </div>
      </div>
    </div>
  )
}

export function MCPDaemonDashboard() {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <ErrorFallback {...props} componentName="MCP Daemon Dashboard" />
      )}
      onReset={() => window.location.reload()}
    >
      <MCPDaemonDashboardContent />
    </ErrorBoundary>
  )
}
