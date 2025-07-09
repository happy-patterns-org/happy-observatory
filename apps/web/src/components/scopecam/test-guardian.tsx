'use client'

import { useState, useEffect } from 'react'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Activity,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { ScopeCamProject } from '@/lib/scopecam/mcp-connection'
import { getTelemetryClient } from '@/lib/scopecam/telemetry'
import { useAgentControl } from '@/lib/agent-control'

interface TestGuardianStatus {
  mode: 'monitor' | 'suggest' | 'auto-fix'
  healthScore: number
  activeIssues: Issue[]
  recentActions: Action[]
  predictions: Prediction[]
}

interface Issue {
  id: string
  type: 'flaky' | 'slow' | 'failing' | 'coverage-gap'
  severity: 'low' | 'medium' | 'high' | 'critical'
  testName?: string
  description: string
  suggestedFix?: string
  autoFixAvailable: boolean
}

interface Action {
  id: string
  timestamp: Date
  type: 'fix-applied' | 'test-quarantined' | 'suggestion-made' | 'alert-sent'
  description: string
  status: 'success' | 'failed' | 'pending'
}

interface Prediction {
  type: 'failure-risk' | 'performance-degradation' | 'coverage-drop'
  probability: number
  timeframe: string
  affectedTests: string[]
}

interface TestGuardianProps {
  project: ScopeCamProject
  mcpConnection: any
}

export function TestGuardian({ project, mcpConnection }: TestGuardianProps) {
  const [status, setStatus] = useState<TestGuardianStatus>({
    mode: 'monitor',
    healthScore: 100,
    activeIssues: [],
    recentActions: [],
    predictions: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const telemetryClient = getTelemetryClient()
  const { agents, executeCommand, isExecuting } = useAgentControl()

  // Find the test guardian agent
  const guardianAgent = agents.find((a) => a.type === 'test-guardian')

  useEffect(() => {
    loadGuardianStatus()

    // Subscribe to real-time updates
    const unsubscribe = telemetryClient.on('test-guardian-update', (data) => {
      if (data.projectId === project.id) {
        updateStatus(data)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [project.id])

  const loadGuardianStatus = async () => {
    setIsLoading(true)
    try {
      // Execute test_guardian tool to get current status
      const response = await mcpConnection.send({
        type: 'execute-tool',
        tool: 'test_guardian',
        parameters: {
          mode: 'status',
          scope: ['all'],
        },
      })

      if (response.status === 'success') {
        setStatus(response.result)
      }
    } catch (error) {
      console.error('Failed to load Test Guardian status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = (data: any) => {
    setStatus((prev) => ({
      ...prev,
      ...data,
      activeIssues: data.issues || prev.activeIssues,
      recentActions: data.actions || prev.recentActions,
      predictions: data.predictions || prev.predictions,
    }))
  }

  const changeMode = async (newMode: TestGuardianStatus['mode']) => {
    if (!guardianAgent) {
      console.error('Test Guardian agent not found')
      return
    }

    try {
      // Use agent control to change mode
      const result = await executeCommand({
        agentId: guardianAgent.id,
        command: 'start',
        parameters: {
          mode: newMode,
          scope: ['all'],
        },
      })

      if (result.success) {
        setStatus((prev) => ({ ...prev, mode: newMode }))

        await telemetryClient.recordEvent({
          name: 'test_guardian.mode_changed',
          projectId: project.id,
          data: { oldMode: status.mode, newMode },
          severity: 'info',
        })
      } else {
        console.error('Failed to change Test Guardian mode:', result.error)
      }
    } catch (error) {
      console.error('Failed to change Test Guardian mode:', error)
    }
  }

  const applyAutoFix = async (issueId: string) => {
    const issue = status.activeIssues.find((i) => i.id === issueId)
    if (!issue || !issue.autoFixAvailable) return

    try {
      await mcpConnection.send({
        type: 'execute-tool',
        tool: 'test_guardian',
        parameters: {
          mode: 'auto-fix',
          issueId,
          confirm: true,
        },
      })

      // Update UI optimistically
      setStatus((prev) => ({
        ...prev,
        activeIssues: prev.activeIssues.filter((i) => i.id !== issueId),
        recentActions: [
          {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            type: 'fix-applied',
            description: `Auto-fixed: ${issue.description}`,
            status: 'pending',
          },
          ...prev.recentActions,
        ],
      }))
    } catch (error) {
      console.error('Failed to apply auto-fix:', error)
    }
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getSeverityColor = (severity: Issue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50'
      case 'high':
        return 'text-orange-600 bg-orange-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-blue-600 bg-blue-50'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-stone-300 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Test Guardian</h3>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-stone-600 mt-2">Loading Test Guardian...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-stone-300 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Test Guardian</h3>
          {guardianAgent && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                guardianAgent.status === 'running'
                  ? 'bg-green-100 text-green-700'
                  : guardianAgent.status === 'paused'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-stone-100 text-stone-700'
              }`}
            >
              {guardianAgent.status}
            </span>
          )}
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-600">Mode:</span>
          <select
            value={status.mode}
            onChange={(e) => changeMode(e.target.value as TestGuardianStatus['mode'])}
            disabled={isExecuting || guardianAgent?.status === 'running'}
            className="px-3 py-1 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="monitor">Monitor</option>
            <option value="suggest">Suggest</option>
            <option value="auto-fix">Auto-Fix</option>
          </select>
        </div>
      </div>

      {/* Health Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-stone-600">Test Suite Health</span>
          <span className={`text-2xl font-bold ${getHealthColor(status.healthScore)}`}>
            {status.healthScore}%
          </span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              status.healthScore >= 90
                ? 'bg-green-600'
                : status.healthScore >= 70
                  ? 'bg-yellow-600'
                  : status.healthScore >= 50
                    ? 'bg-orange-600'
                    : 'bg-red-600'
            }`}
            style={{ width: `${status.healthScore}%` }}
          />
        </div>
      </div>

      {/* Active Issues */}
      {status.activeIssues.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Active Issues</h4>
          <div className="space-y-2">
            {status.activeIssues.map((issue) => (
              <div key={issue.id} className="p-3 rounded-md border border-stone-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(issue.severity)}`}
                      >
                        {issue.severity}
                      </span>
                      <span className="text-xs text-stone-500">{issue.type.replace('-', ' ')}</span>
                    </div>
                    <p className="text-sm text-stone-900">{issue.description}</p>
                    {issue.testName && (
                      <p className="text-xs text-stone-600 mt-1">Test: {issue.testName}</p>
                    )}
                    {issue.suggestedFix && (
                      <p className="text-xs text-blue-600 mt-1">Suggestion: {issue.suggestedFix}</p>
                    )}
                  </div>
                  {issue.autoFixAvailable && status.mode === 'auto-fix' && (
                    <button
                      onClick={() => applyAutoFix(issue.id)}
                      className="ml-3 px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Auto-Fix
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictions */}
      {status.predictions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-stone-700 mb-3">Predictions</h4>
          <div className="space-y-2">
            {status.predictions.map((prediction, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-stone-50 rounded-md"
              >
                <div className="flex items-center gap-2">
                  {prediction.probability > 0.7 ? (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className="text-sm text-stone-700">
                    {prediction.type.replace('-', ' ')} in {prediction.timeframe}
                  </span>
                </div>
                <span className="text-sm font-medium text-stone-900">
                  {Math.round(prediction.probability * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Actions */}
      {status.recentActions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-stone-700 mb-3">Recent Actions</h4>
          <div className="space-y-1">
            {status.recentActions.slice(0, 5).map((action) => (
              <div key={action.id} className="flex items-center gap-2 text-xs">
                {action.status === 'success' ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : action.status === 'failed' ? (
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                ) : (
                  <Activity className="w-3 h-3 text-blue-600" />
                )}
                <span className="text-stone-600">
                  {new Date(action.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-stone-900">{action.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
