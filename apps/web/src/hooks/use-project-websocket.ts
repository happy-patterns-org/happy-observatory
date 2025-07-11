'use client'

import { getProjectWebSocketUrl } from '@/config-adapter'
import { logger } from '@/lib/logger-client'
import { useProjectStore } from '@/store/project-store'
import type { WSMessage, WSMetricsMessage, WSAgentStatusMessage } from '@business-org/shared-config-ts/src/index'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface ProjectWebSocketOptions {
  onTelemetry?: (data: any) => void
  onAgentStatus?: (data: any) => void
  onLog?: (data: any) => void
  onError?: (error: Error) => void
  autoConnect?: boolean
}

// Use typed message from shared config
type WebSocketMessage = WSMessage

export function useProjectWebSocket(options: ProjectWebSocketOptions = {}) {
  const { selectedProject, updateConnectionStatus, updateAgentActivity } = useProjectStore()
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 2000

  const connect = useCallback(() => {
    if (!selectedProject?.id) {
      logger.warn('No project selected for WebSocket connection')
      return
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    const wsUrl = selectedProject.wsUrl || getProjectWebSocketUrl(selectedProject.id)

    logger.info('Connecting to project WebSocket', {
      projectId: selectedProject.id,
      url: wsUrl,
    })

    updateConnectionStatus(selectedProject.id, { bridge: 'connecting' })

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close()
          setConnectionError('Connection timeout - bridge server may not be running')
          updateConnectionStatus(selectedProject.id, {
            bridge: 'error',
            lastError: 'Connection timeout',
          })
        }
      }, 5000)

      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        logger.info('Project WebSocket connected', { projectId: selectedProject.id })
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0
        updateConnectionStatus(selectedProject.id, { bridge: 'connected' })

        // Subscribe to project events
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            projectId: selectedProject.id,
          })
        )
      }

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)
          setLastMessage(message)

          // Route message based on type
          switch (message.type) {
            case 'metrics':
              options.onTelemetry?.((message as WSMetricsMessage).data)
              break
            case 'agent_status_update':
            case 'agent_status_full':
              const agentMsg = message as WSAgentStatusMessage
              options.onAgentStatus?.(agentMsg.data)
              // Update store with agent activity if available
              const agentData = agentMsg.data
              if (agentData.agents) {
                // Calculate activity metrics from agents
                const agentStatuses = Object.values(agentData.agents)
                const activeAgents = agentStatuses.filter(s => s.status === 'running').length
                const activity = {
                  activeAgents,
                  totalTasks: agentStatuses.length,
                  completedTasks: 0 // This would need to be tracked separately
                }
                updateAgentActivity(selectedProject.id, activity)
              }
              break
            case 'log':
              // Log messages might have data property
              options.onLog?.((message as any).data || message)
              break
            case 'error':
              // Error messages might have data property with message
              const errorData = (message as any).data
              options.onError?.(new Error(errorData?.message || 'WebSocket error'))
              break
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message', error as Error)
        }
      }

      ws.onerror = () => {
        logger.error('Project WebSocket error', new Error('WebSocket error'))
        setConnectionError('WebSocket connection error')
        updateConnectionStatus(selectedProject.id, {
          bridge: 'error',
          lastError: 'Connection error',
        })
      }

      ws.onclose = () => {
        logger.info('Project WebSocket disconnected', { projectId: selectedProject.id })
        setIsConnected(false)
        updateConnectionStatus(selectedProject.id, { bridge: 'disconnected' })

        // Only attempt reconnection if it was previously connected
        // This prevents endless reconnection attempts when bridge server is not running
        if (
          isConnected &&
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          options.autoConnect !== false
        ) {
          reconnectAttemptsRef.current++
          logger.info(
            `Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectDelay * reconnectAttemptsRef.current)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Bridge server connection lost')
          updateConnectionStatus(selectedProject.id, {
            bridge: 'error',
            lastError: 'Connection lost - bridge server may be down',
          })
        }
      }
    } catch (error) {
      logger.error('Failed to create WebSocket', error as Error)
      setConnectionError('Failed to create WebSocket connection')
      updateConnectionStatus(selectedProject.id, {
        bridge: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [
    selectedProject?.id,
    selectedProject?.wsUrl,
    options.autoConnect,
    options.onTelemetry,
    options.onAgentStatus,
    options.onLog,
    options.onError,
    updateConnectionStatus,
    updateAgentActivity,
    isConnected,
  ])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (wsRef.current) {
      // Send unsubscribe message
      if (wsRef.current.readyState === WebSocket.OPEN && selectedProject?.id) {
        wsRef.current.send(
          JSON.stringify({
            type: 'unsubscribe',
            projectId: selectedProject.id,
          })
        )
      }

      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
    reconnectAttemptsRef.current = 0
  }, [selectedProject])

  const sendMessage = useCallback(
    (message: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            ...message,
            projectId: selectedProject?.id,
            timestamp: new Date().toISOString(),
          })
        )
      } else {
        logger.warn('Cannot send message, WebSocket not connected')
      }
    },
    [selectedProject]
  )

  // Auto-connect when project changes
  useEffect(() => {
    // Prevent connection if already connected or connecting
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      return
    }

    if (selectedProject && options.autoConnect !== false) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [selectedProject?.id, connect, disconnect, options.autoConnect]) // Proper dependencies

  return {
    isConnected,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    sendMessage,
    projectId: selectedProject?.id,
  }
}
