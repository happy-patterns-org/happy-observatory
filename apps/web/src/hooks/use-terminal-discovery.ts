'use client'

import config, { getBridgeAPIUrl } from '@/config-adapter'
import { logger } from '@/lib/logger-client'
import { useCallback, useEffect, useState } from 'react'

interface TerminalEndpoint {
  id: string
  projectId: string
  url: string
  type: 'local' | 'remote' | 'container'
  status: 'active' | 'inactive' | 'unknown'
  metadata?: {
    cwd?: string
    shell?: string
    uptime?: number
  }
}

interface TerminalMetrics {
  endpoint: string
  sessionsActive: number
  totalCommands: number
  cpuUsage?: number
  memoryUsage?: number
  lastActivity: Date
}

/**
 * Hook to discover terminal endpoints via bridge server
 * Falls back gracefully if bridge is not available
 */
export function useTerminalDiscovery(projectId?: string) {
  const [endpoints, setEndpoints] = useState<TerminalEndpoint[]>([])
  const [metrics, setMetrics] = useState<TerminalMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bridgeUrl = config.bridgeServerUrl

  // Discover available terminal endpoints
  const discoverEndpoints = useCallback(async () => {
    if (!bridgeUrl) {
      // No bridge configured, use default local endpoint
      setEndpoints([
        {
          id: 'local-default',
          projectId: projectId || 'default',
          url: config.nexusConsoleUrl,
          type: 'local',
          status: 'unknown',
        },
      ])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(getBridgeAPIUrl('/api/terminals/discover'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ projectId }),
      })

      if (!response.ok) {
        throw new Error('Failed to discover terminals')
      }

      const data = await response.json()
      setEndpoints(data.endpoints || [])

      // If no endpoints found, add default
      if (!data.endpoints || data.endpoints.length === 0) {
        setEndpoints([
          {
            id: 'local-default',
            projectId: projectId || 'default',
            url: config.nexusConsoleUrl,
            type: 'local',
            status: 'unknown',
          },
        ])
      }
    } catch (err) {
      logger.debug('Terminal discovery failed, using defaults', { error: err })
      // Fallback to default endpoint
      setEndpoints([
        {
          id: 'local-default',
          projectId: projectId || 'default',
          url: config.nexusConsoleUrl,
          type: 'local',
          status: 'unknown',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [bridgeUrl, projectId])

  // Report terminal metrics to bridge
  const reportMetrics = useCallback(
    async (terminalMetrics: Partial<TerminalMetrics>) => {
      if (!bridgeUrl) return

      try {
        await fetch(getBridgeAPIUrl('/api/terminals/metrics'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            projectId,
            ...terminalMetrics,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (err) {
        // Silently fail - metrics are optional enhancement
        logger.debug('Failed to report terminal metrics', { error: err })
      }
    },
    [bridgeUrl, projectId]
  )

  // Fetch terminal metrics from bridge
  const fetchMetrics = useCallback(
    async (endpointId: string) => {
      if (!bridgeUrl) return

      try {
        const response = await fetch(getBridgeAPIUrl(`/api/terminals/${endpointId}/metrics`), {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } catch (err) {
        logger.debug('Failed to fetch terminal metrics', { error: err })
      }
    },
    [bridgeUrl]
  )

  // Initial discovery on mount
  useEffect(() => {
    discoverEndpoints()
  }, [discoverEndpoints])

  // Periodic endpoint refresh (every 30s)
  useEffect(() => {
    const interval = setInterval(discoverEndpoints, 30000)
    return () => clearInterval(interval)
  }, [discoverEndpoints])

  return {
    endpoints,
    metrics,
    isLoading,
    error,
    discoverEndpoints,
    reportMetrics,
    fetchMetrics,
    // Helper to get the best endpoint for a project
    getBestEndpoint: (preferredType?: 'local' | 'remote' | 'container') => {
      const activeEndpoints = endpoints.filter((e) => e.status === 'active')

      if (preferredType) {
        const preferred = activeEndpoints.find((e) => e.type === preferredType)
        if (preferred) return preferred
      }

      // Prefer local, then container, then remote
      return (
        activeEndpoints.find((e) => e.type === 'local') ||
        activeEndpoints.find((e) => e.type === 'container') ||
        activeEndpoints.find((e) => e.type === 'remote') ||
        endpoints[0]
      )
    },
  }
}
