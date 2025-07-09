'use client'

import { useState, useEffect } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  BarChart3,
  FileSearch,
  Shield,
  Terminal,
  StopCircle,
  Activity,
} from 'lucide-react'
import { ScopeCamProject } from '@/lib/scopecam/mcp-connection'
import { getTelemetryClient } from '@/lib/scopecam/telemetry'
import { SCOPECAM_MCP_TOOLS } from '@/lib/scopecam/mcp-tools'
import { TestGuardian } from './test-guardian'
import { useAgentControl } from '@/lib/agent-control'
import { AgentStatusMonitor } from '../agent-status-monitor'

interface TestDashboardProps {
  project: ScopeCamProject
  mcpConnection: any
}

interface TestMetrics {
  total: number
  passed: number
  failed: number
  skipped: number
  flaky: number
  duration: number
  coverage: {
    percentage: number
    trend: 'up' | 'down' | 'stable'
    delta: number
  }
  performance: {
    avgDuration: number
    slowTests: number
    trend: 'improving' | 'degrading' | 'stable'
  }
}

interface ActiveTool {
  name: string
  status: 'running' | 'completed' | 'failed'
  startTime: Date
  progress?: number
  result?: any
}

export function TestDashboard({ project, mcpConnection }: TestDashboardProps) {
  const [metrics, setMetrics] = useState<TestMetrics>({
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    duration: 0,
    coverage: { percentage: 0, trend: 'stable', delta: 0 },
    performance: { avgDuration: 0, slowTests: 0, trend: 'stable' },
  })

  const [activeTools, setActiveTools] = useState<Map<string, ActiveTool>>(new Map())
  const [selectedTool, setSelectedTool] = useState<string>('test_selector')
  const [toolParams, setToolParams] = useState<Record<string, any>>({})
  const [recentResults, setRecentResults] = useState<any[]>([])
  const [showAgentStatus, setShowAgentStatus] = useState(false)

  const telemetryClient = getTelemetryClient()
  const { agents, executeCommand, isExecuting } = useAgentControl()

  // Find the test orchestrator agent
  const orchestratorAgent = agents.find((a) => a.type === 'orchestrator')
  const isRunning = orchestratorAgent?.status === 'running'

  useEffect(() => {
    loadMetrics()

    // Subscribe to real-time updates
    const unsubscribeTelemetry = telemetryClient.on('*', handleTelemetryUpdate)

    return () => {
      unsubscribeTelemetry()
    }
  }, [project.id])

  const loadMetrics = async () => {
    try {
      // Fetch current metrics
      const [testMetrics, coverageMetrics, performanceMetrics] = await Promise.all([
        telemetryClient.fetchMetrics(project.id, {
          metricNames: ['scopecam.tests.total', 'scopecam.tests.passed', 'scopecam.tests.failed'],
        }),
        telemetryClient.fetchMetrics(project.id, {
          metricNames: ['scopecam.coverage.percentage'],
        }),
        telemetryClient.fetchMetrics(project.id, {
          metricNames: ['scopecam.performance.avg_duration'],
        }),
      ])

      // Process and update metrics
      updateMetricsFromTelemetry(testMetrics, coverageMetrics, performanceMetrics)
    } catch (error) {
      console.error('Failed to load metrics:', error)
    }
  }

  const updateMetricsFromTelemetry = (
    testMetrics: any[],
    coverageMetrics: any[],
    performanceMetrics: any[]
  ) => {
    // Implementation would process telemetry data
    // This is a simplified version
    setMetrics((prev) => ({
      ...prev,
      // Update based on telemetry data
    }))
  }

  const handleTelemetryUpdate = (data: any) => {
    if (data.type === 'metric' && data.payload.labels?.projectId === project.id) {
      // Update metrics in real-time
      const { name, value } = data.payload

      switch (name) {
        case 'scopecam.tests.total':
          setMetrics((prev) => ({ ...prev, total: value }))
          break
        case 'scopecam.tests.passed':
          setMetrics((prev) => ({ ...prev, passed: value }))
          break
        case 'scopecam.tests.failed':
          setMetrics((prev) => ({ ...prev, failed: value }))
          break
        case 'scopecam.coverage.percentage':
          setMetrics((prev) => ({
            ...prev,
            coverage: { ...prev.coverage, percentage: value },
          }))
          break
      }
    }
  }

  const executeTool = async (toolName: string, parameters: Record<string, any>) => {
    const toolInfo = SCOPECAM_MCP_TOOLS.find((t) => t.name === toolName)
    if (!toolInfo) return

    const toolId = crypto.randomUUID()

    // Add to active tools
    setActiveTools((prev) =>
      new Map(prev).set(toolId, {
        name: toolName,
        status: 'running',
        startTime: new Date(),
      })
    )

    try {
      const response = await mcpConnection.send({
        type: 'execute-tool',
        tool: toolName,
        parameters,
        projectId: project.id,
        requestId: toolId,
      })

      // Update tool status
      setActiveTools((prev) => {
        const updated = new Map(prev)
        const tool = updated.get(toolId)
        if (tool) {
          tool.status = 'completed'
          tool.result = response.result
        }
        return updated
      })

      // Add to recent results
      setRecentResults((prev) =>
        [
          {
            toolName,
            timestamp: new Date(),
            result: response.result,
            duration: response.duration,
          },
          ...prev,
        ].slice(0, 10)
      )
    } catch (error) {
      // Update tool status on error
      setActiveTools((prev) => {
        const updated = new Map(prev)
        const tool = updated.get(toolId)
        if (tool) {
          tool.status = 'failed'
        }
        return updated
      })

      console.error(`Tool execution failed: ${toolName}`, error)
    }
  }

  const runTestSuite = async () => {
    if (!orchestratorAgent) {
      console.error('Test orchestrator agent not found')
      return
    }

    try {
      // Start the orchestrator agent with parameters
      const result = await executeCommand({
        agentId: orchestratorAgent.id,
        command: 'start',
        parameters: {
          suite: 'all',
          parallel: true,
          environment: 'local',
        },
      })

      if (!result.success) {
        console.error('Failed to start test suite:', result.error)
        // Could show a toast notification here
      }
    } catch (error) {
      console.error('Error starting test suite:', error)
    }
  }

  const stopTestSuite = async () => {
    if (!orchestratorAgent) return

    try {
      const result = await executeCommand({
        agentId: orchestratorAgent.id,
        command: 'stop',
      })

      if (!result.success) {
        console.error('Failed to stop test suite:', result.error)
      }
    } catch (error) {
      console.error('Error stopping test suite:', error)
    }
  }

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'test_selector':
        return <FileSearch className="w-4 h-4" />
      case 'failure_analyzer':
        return <AlertCircle className="w-4 h-4" />
      case 'test_orchestrator':
        return <Play className="w-4 h-4" />
      case 'coverage_optimizer':
        return <BarChart3 className="w-4 h-4" />
      case 'performance_monitor':
        return <Zap className="w-4 h-4" />
      case 'flakiness_detector':
        return <RotateCcw className="w-4 h-4" />
      case 'test_guardian':
        return <Shield className="w-4 h-4" />
      default:
        return <Terminal className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-stone-300 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-600">Total Tests</span>
            <CheckCircle className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl font-semibold text-stone-900">{metrics.total}</p>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <span className="text-green-600">✓ {metrics.passed}</span>
            <span className="text-red-600">✗ {metrics.failed}</span>
            <span className="text-yellow-600">⚠ {metrics.flaky}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-stone-300 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-600">Coverage</span>
            {metrics.coverage.trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : metrics.coverage.trend === 'down' ? (
              <TrendingDown className="w-4 h-4 text-red-600" />
            ) : (
              <BarChart3 className="w-4 h-4 text-stone-400" />
            )}
          </div>
          <p className="text-2xl font-semibold text-stone-900">
            {metrics.coverage.percentage.toFixed(1)}%
          </p>
          <p className="text-xs text-stone-600 mt-1">
            {metrics.coverage.delta > 0 ? '+' : ''}
            {metrics.coverage.delta.toFixed(1)}% from last run
          </p>
        </div>

        <div className="bg-white rounded-lg border border-stone-300 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-600">Avg Duration</span>
            <Clock className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl font-semibold text-stone-900">
            {(metrics.performance.avgDuration / 1000).toFixed(1)}s
          </p>
          <p className="text-xs text-stone-600 mt-1">{metrics.performance.slowTests} slow tests</p>
        </div>

        <div className="bg-white rounded-lg border border-stone-300 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-600">Test Suite Control</span>
            {isRunning ? (
              <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
            ) : orchestratorAgent?.status === 'paused' ? (
              <Pause className="w-4 h-4 text-yellow-600" />
            ) : (
              <Play className="w-4 h-4 text-stone-400" />
            )}
          </div>
          <div className="space-y-2">
            {!isRunning ? (
              <button
                onClick={runTestSuite}
                disabled={isExecuting || !orchestratorAgent?.canStart}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Run Tests
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    executeCommand({ agentId: orchestratorAgent!.id, command: 'pause' })
                  }
                  disabled={isExecuting || !orchestratorAgent?.canPause}
                  className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-1"
                >
                  <Pause className="w-3 h-3" />
                  Pause
                </button>
                <button
                  onClick={stopTestSuite}
                  disabled={isExecuting || !orchestratorAgent?.canStop}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-1"
                >
                  <StopCircle className="w-3 h-3" />
                  Stop
                </button>
              </div>
            )}
            <button
              onClick={() => setShowAgentStatus(!showAgentStatus)}
              className="w-full px-3 py-1 text-xs text-stone-600 hover:text-stone-800"
            >
              {showAgentStatus ? 'Hide' : 'Show'} Agent Status
            </button>
          </div>
        </div>
      </div>

      {/* Agent Status Monitor */}
      {showAgentStatus && <AgentStatusMonitor projectId={project.id} />}

      {/* Tools Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool Selector */}
        <div className="bg-white rounded-lg border border-stone-300 p-6">
          <h3 className="text-lg font-semibold mb-4">ScopeCam Tools</h3>

          <div className="space-y-3">
            {SCOPECAM_MCP_TOOLS.map((tool) => (
              <button
                key={tool.name}
                onClick={() => setSelectedTool(tool.name)}
                className={`w-full flex items-center gap-3 p-3 rounded-md border transition-colors ${
                  selectedTool === tool.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className={selectedTool === tool.name ? 'text-blue-600' : 'text-stone-600'}>
                  {getToolIcon(tool.name)}
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-stone-900">
                    {tool.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </p>
                  <p className="text-xs text-stone-600">{tool.description}</p>
                </div>
                {activeTools.has(tool.name) && (
                  <div className="flex items-center gap-1">
                    {activeTools.get(tool.name)?.status === 'running' && (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    )}
                    {activeTools.get(tool.name)?.status === 'completed' && (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    )}
                    {activeTools.get(tool.name)?.status === 'failed' && (
                      <XCircle className="w-3 h-3 text-red-600" />
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Execute Selected Tool */}
          <div className="mt-4 pt-4 border-t border-stone-200">
            <button
              onClick={() => executeTool(selectedTool, toolParams)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Execute {selectedTool.replace(/_/g, ' ')}
            </button>
          </div>
        </div>

        {/* Test Guardian */}
        <TestGuardian project={project} mcpConnection={mcpConnection} />
      </div>

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <div className="bg-white rounded-lg border border-stone-300 p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Tool Results</h3>
          <div className="space-y-3">
            {recentResults.map((result, idx) => (
              <div key={idx} className="p-3 bg-stone-50 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getToolIcon(result.toolName)}
                    <span className="text-sm font-medium">
                      {result.toolName.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-stone-600">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="text-xs text-stone-700 overflow-x-auto">
                  {JSON.stringify(result.result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
