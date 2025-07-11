'use client'

import { API_PATHS } from '@/config-adapter'
import { useProjectStore } from '@/store/project-store'
import {
  Activity,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Server,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import useSWR from 'swr'
import { ErrorFallback } from './error-fallback'
import { MockDataIndicator } from './mock-data-indicator'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  subtitle?: string
}

function MetricCard({ title, value, change, icon: Icon, trend, subtitle }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-stone-600" />
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm ${
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                  ? 'text-red-600'
                  : 'text-stone-500'
            }`}
          >
            {trend === 'up' && <TrendingUp className="w-4 h-4" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4" />}
            <span>
              {change > 0 ? '+' : ''}
              {change}%
            </span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-stone-900">{value}</p>
        <p className="text-sm font-medium text-stone-600">{title}</p>
        {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
      </div>
    </div>
  )
}

function DashboardMetricsContent() {
  const { selectedProject } = useProjectStore()
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 0,
    memory: 0,
    uptime: '0h',
    activeConnections: 0,
  })
  const [agentMetrics, setAgentMetrics] = useState({
    active: 0,
    total: 0,
    tasksCompleted: 0,
    successRate: 0,
  })
  const [isRealData, setIsRealData] = useState(false)

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  // Use SWR for data fetching with automatic refresh and rate limit handling
  const { data } = useSWR(
    selectedProject?.id
      ? `${API_PATHS.telemetryMetrics(selectedProject.id)}?minutes=60`
      : `${API_PATHS.metrics}?minutes=60`,
    // The global fetcher from SWR config handles auth and rate limiting
    {
      refreshInterval: 30000, // 30 seconds
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  // Process SWR data into metrics state
  useEffect(() => {
    if (data?.metrics) {
      setSystemMetrics({
        cpu: data.metrics.system.cpu,
        memory: data.metrics.system.memory,
        uptime: formatUptime(data.metrics.system.uptime),
        activeConnections: data.metrics.agents.active,
      })

      setAgentMetrics({
        active: data.metrics.agents.active,
        total: data.metrics.agents.total,
        tasksCompleted: data.metrics.agents.tasks_completed,
        successRate: data.metrics.agents.success_rate,
      })

      setIsRealData(data.isRealData || false)
    }
  }, [data])

  const metrics = [
    {
      title: 'Active Agents',
      value: agentMetrics.active,
      change: 12,
      icon: Users,
      trend: 'up' as const,
      subtitle: `of ${agentMetrics.total} total`,
    },
    {
      title: 'Tasks Completed',
      value: agentMetrics.tasksCompleted,
      change: -5,
      icon: CheckCircle,
      trend: 'down' as const,
      subtitle: 'Last hour',
    },
    {
      title: 'Success Rate',
      value: `${(agentMetrics.successRate * 100).toFixed(1)}%`,
      change: 2,
      icon: Activity,
      trend: 'up' as const,
      subtitle: 'Current session',
    },
    {
      title: 'Avg Response Time',
      value: '1.2s',
      change: -15,
      icon: Clock,
      trend: 'up' as const,
      subtitle: 'Improved',
    },
  ]

  const systemCards = [
    {
      title: 'CPU Usage',
      value: `${systemMetrics.cpu}%`,
      icon: Cpu,
    },
    {
      title: 'Memory',
      value: `${systemMetrics.memory}%`,
      icon: HardDrive,
    },
    {
      title: 'Uptime',
      value: systemMetrics.uptime,
      icon: Server,
    },
    {
      title: 'Connections',
      value: systemMetrics.activeConnections,
      icon: Database,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Project Context */}
      {selectedProject && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Active Project: {selectedProject.name}
            </span>
          </div>
          {selectedProject.hasSubmoduleMCP && (
            <p className="text-xs text-blue-700 mt-1">MCP Server Connected</p>
          )}
        </div>
      )}

      {/* Main Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Agent Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>
      </div>

      {/* System Metrics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900">System Health</h2>
          {!isRealData && <MockDataIndicator feature="System metrics" />}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemCards.map((card) => (
            <MetricCard key={card.title} {...card} />
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900">Recent Activity</h2>
          <MockDataIndicator feature="Activity feed" />
        </div>
        <div className="bg-white rounded-lg border border-stone-200">
          <div className="divide-y divide-stone-100">
            {[
              { time: '2 min ago', event: 'Agent started: Test Runner', type: 'info' },
              { time: '5 min ago', event: 'Task completed: Code Analysis', type: 'success' },
              { time: '12 min ago', event: 'MCP connection established', type: 'info' },
              { time: '15 min ago', event: 'Error: Failed to connect to database', type: 'error' },
              { time: '20 min ago', event: 'Project switched: ScopeCam', type: 'info' },
            ].map((item, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.type === 'error'
                        ? 'bg-red-500'
                        : item.type === 'success'
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                    }`}
                  />
                  <span className="text-sm text-stone-900">{item.event}</span>
                </div>
                <span className="text-xs text-stone-500">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardMetrics() {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => <ErrorFallback {...props} componentName="Dashboard Metrics" />}
      onReset={() => window.location.reload()}
    >
      <DashboardMetricsContent />
    </ErrorBoundary>
  )
}
