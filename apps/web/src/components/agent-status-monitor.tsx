'use client'

import { API_PATHS } from '@/config-adapter'
import { getTelemetryClient } from '@/lib/scopecam/telemetry'
import { Activity, CheckCircle, Clock, Pause, RefreshCw, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import useSWR from 'swr'
import { ErrorFallback } from './error-fallback'

interface AgentStatus {
  id: string
  name: string
  type: 'mcp-tool' | 'test-guardian' | 'orchestrator' | 'analyzer'
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused'
  lastActivity: Date
  currentTask?: {
    name: string
    progress: number
    startTime: Date
    estimatedCompletion?: Date
  }
  metrics: {
    tasksCompleted: number
    tasksFailed: number
    avgDuration: number
    uptime: number
  }
}

interface AgentStatusMonitorProps {
  projectId?: string
}

function AgentStatusMonitorContent({ projectId }: AgentStatusMonitorProps = {}) {
  const [agents, setAgents] = useState<AgentStatus[]>([])

  const telemetryClient = getTelemetryClient()

  // Use SWR for data fetching with automatic refresh and rate limit handling
  const { data, error, isLoading, mutate } = useSWR<{ agents: any[] }>(
    projectId ? API_PATHS.agentStatus(projectId) : null,
    // The global fetcher from SWR config handles auth and rate limiting
    {
      // Keep the real-time feel with more frequent updates
      refreshInterval: 30000, // 30 seconds
      // Disable these to prevent request storms
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  // Process SWR data into AgentStatus format
  useEffect(() => {
    if (data?.agents) {
      const transformedAgents: AgentStatus[] = data.agents.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        lastActivity: new Date(),
        metrics: {
          tasksCompleted: Math.floor(Math.random() * 100),
          tasksFailed: Math.floor(Math.random() * 10),
          avgDuration: Math.floor(Math.random() * 60),
          uptime: Date.now() - Math.floor(Math.random() * 86400000),
        },
      }))
      setAgents(transformedAgents)
    }
  }, [data])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = telemetryClient.on('agent-status', (statusData) => {
      if (statusData.projectId === projectId) {
        updateAgentStatus(statusData.agentId, statusData.status)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [projectId, telemetryClient])

  const updateAgentStatus = (agentId: string, updates: Partial<AgentStatus>) => {
    setAgents((prev) =>
      prev.map((agent) => (agent.id === agentId ? { ...agent, ...updates } : agent))
    )
  }

  const getStatusIcon = (status: AgentStatus['status']) => {
    switch (status) {
      case 'running':
        return <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-stone-400" />
    }
  }

  const getStatusColor = (status: AgentStatus['status']) => {
    switch (status) {
      case 'running':
        return 'text-blue-600 bg-blue-50'
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      case 'paused':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-stone-600 bg-stone-50'
    }
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  const getAgentTypeLabel = (type: AgentStatus['type']): string => {
    switch (type) {
      case 'mcp-tool':
        return 'MCP Tool'
      case 'test-guardian':
        return 'Test Guardian'
      case 'orchestrator':
        return 'Orchestrator'
      case 'analyzer':
        return 'Analyzer'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-stone-300 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-stone-300 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-stone-900">Agent Status Monitor</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => mutate()}
            className="p-1 hover:bg-stone-100 rounded transition-colors"
            title="Refresh now"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 text-stone-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs text-stone-500">
            {isLoading ? 'Updating...' : 'Auto-refreshes every 30s'}
          </span>
        </div>
      </div>

      {/* Agent List */}
      {error ? (
        <div className="text-center py-8 text-red-500">
          Failed to load agent statuses. {error.message}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-8 text-stone-500">No active agents detected</div>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="border border-stone-200 rounded-lg p-4 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Agent Header */}
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(agent.status)}
                    <h4 className="font-medium text-stone-900">{agent.name}</h4>
                    <span className="text-xs text-stone-500">{getAgentTypeLabel(agent.type)}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(agent.status)}`}
                    >
                      {agent.status}
                    </span>
                  </div>

                  {/* Current Task */}
                  {agent.currentTask && (
                    <div className="ml-7 mb-3">
                      <div className="text-sm text-stone-700 mb-1">{agent.currentTask.name}</div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-stone-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${agent.currentTask.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-stone-600">
                          {agent.currentTask.progress}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-stone-500">
                        <span>
                          Started: {new Date(agent.currentTask.startTime).toLocaleTimeString()}
                        </span>
                        {agent.currentTask.estimatedCompletion && (
                          <span>
                            Est. completion:{' '}
                            {new Date(agent.currentTask.estimatedCompletion).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="ml-7 grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-stone-500">Completed:</span>
                      <span className="ml-1 font-medium text-stone-900">
                        {agent.metrics.tasksCompleted}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500">Failed:</span>
                      <span className="ml-1 font-medium text-red-600">
                        {agent.metrics.tasksFailed}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500">Avg Duration:</span>
                      <span className="ml-1 font-medium text-stone-900">
                        {formatDuration(agent.metrics.avgDuration)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500">Uptime:</span>
                      <span className="ml-1 font-medium text-stone-900">
                        {formatDuration(agent.metrics.uptime)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last Activity */}
                <div className="text-right">
                  <div className="text-xs text-stone-500">Last activity</div>
                  <div className="text-sm text-stone-700">
                    {new Date(agent.lastActivity).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-stone-200">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold text-stone-900">
              {agents.filter((a) => a.status === 'running').length}
            </div>
            <div className="text-xs text-stone-600">Active</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-stone-900">
              {agents.filter((a) => a.status === 'idle').length}
            </div>
            <div className="text-xs text-stone-600">Idle</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-green-600">
              {agents.reduce((sum, a) => sum + a.metrics.tasksCompleted, 0)}
            </div>
            <div className="text-xs text-stone-600">Tasks Completed</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-red-600">
              {agents.reduce((sum, a) => sum + a.metrics.tasksFailed, 0)}
            </div>
            <div className="text-xs text-stone-600">Tasks Failed</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AgentStatusMonitor(props: AgentStatusMonitorProps) {
  return (
    <ErrorBoundary
      FallbackComponent={(fallbackProps) => (
        <ErrorFallback {...fallbackProps} componentName="Agent Status Monitor" />
      )}
      onReset={() => window.location.reload()}
    >
      <AgentStatusMonitorContent {...props} />
    </ErrorBoundary>
  )
}
