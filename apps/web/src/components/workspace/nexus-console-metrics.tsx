'use client'

import { getBridgeAPIUrl } from '@/config-adapter'
import { logger } from '@/lib/logger-client'
import { useEffect, useRef } from 'react'

// Placeholder for the upcoming @happy-devkit/nexus-console package
// This will be replaced with actual imports once the package is published

interface MetricsCollectorConfig {
  bridgeUrl?: string
  bridgeServerUrl?: string // Add this for compatibility
  flushInterval?: number
  enableAutoFlush?: boolean
}

/**
 * Metrics collection for Nexus Console
 * This is a placeholder implementation that will be replaced
 * with the actual MetricsCollector from @happy-devkit/nexus-console
 */
export class MetricsCollectorPlaceholder {
  private metrics: Array<{
    type: string
    data: any
    timestamp: number
  }> = []

  private flushTimer?: NodeJS.Timeout

  constructor(private config: MetricsCollectorConfig = {}) {
    if (config.enableAutoFlush !== false) {
      this.startAutoFlush()
    }
  }

  trackCommand(command: string, metadata?: any) {
    this.metrics.push({
      type: 'command',
      data: { command, ...metadata },
      timestamp: Date.now(),
    })

    logger.debug('Command tracked', { command, metadata })
  }

  trackLatency(operation: string, duration: number) {
    this.metrics.push({
      type: 'latency',
      data: { operation, duration },
      timestamp: Date.now(),
    })
  }

  trackSession(event: 'start' | 'end', sessionId: string) {
    this.metrics.push({
      type: 'session',
      data: { event, sessionId },
      timestamp: Date.now(),
    })
  }

  async flush() {
    if (this.metrics.length === 0) return

    const toFlush = [...this.metrics]
    this.metrics = []

    if (!this.config.bridgeUrl) {
      logger.debug('No bridge URL configured, metrics not sent', { count: toFlush.length })
      return
    }

    try {
      // This will be replaced with actual bridge client call
      logger.info('Would flush metrics to bridge', {
        url: getBridgeAPIUrl('/api/terminals/metrics'),
        count: toFlush.length,
      })

      // Placeholder for actual implementation:
      // await bridgeClient.reportMetrics(toFlush)
    } catch (error) {
      logger.error('Failed to flush metrics', error as Error)
      // Re-add metrics for retry
      this.metrics.unshift(...toFlush)
    }
  }

  private startAutoFlush() {
    const interval = this.config.flushInterval || 30000 // 30s default

    this.flushTimer = setInterval(() => {
      this.flush().catch((err) => logger.error('Auto-flush failed', err))
    }, interval)
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    // Final flush
    this.flush().catch(() => {})
  }
}

/**
 * Hook for using metrics collection in components
 */
export function useNexusMetrics(config?: MetricsCollectorConfig) {
  const collectorRef = useRef<MetricsCollectorPlaceholder>()

  useEffect(() => {
    collectorRef.current = new MetricsCollectorPlaceholder({
      ...(config?.bridgeServerUrl && { bridgeUrl: config.bridgeServerUrl }),
    })

    return () => {
      collectorRef.current?.destroy()
    }
  }, [])

  return {
    trackCommand: (cmd: string, metadata?: any) =>
      collectorRef.current?.trackCommand(cmd, metadata),
    trackLatency: (op: string, duration: number) =>
      collectorRef.current?.trackLatency(op, duration),
    trackSession: (event: 'start' | 'end', sessionId: string) =>
      collectorRef.current?.trackSession(event, sessionId),
    flush: () => collectorRef.current?.flush(),
  }
}

// Example usage in NexusConsoleIntegration:
/*
const metrics = useNexusMetrics({
  flushInterval: 5000 // 5s
})

// Track command execution
const handleCommand = (command: string) => {
  const startTime = Date.now()
  
  metrics.trackCommand(command, {
    projectId: selectedProject?.id,
    source: 'nexus-console'
  })
  
  // After execution
  metrics.trackLatency('command-execution', Date.now() - startTime)
}

// Track session lifecycle
useEffect(() => {
  const sessionId = generateSessionId()
  metrics.trackSession('start', sessionId)
  
  return () => {
    metrics.trackSession('end', sessionId)
  }
}, [])
*/
