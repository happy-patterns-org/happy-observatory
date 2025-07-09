'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useProjectStore } from '@/store/project-store'
import { logger } from '@/lib/logger-client'
import { env } from '@/lib/env'

export interface ProjectWebSocketOptions {
  onTelemetry?: (data: any) => void
  onAgentStatus?: (data: any) => void
  onLog?: (data: any) => void
  onError?: (error: Error) => void
  autoConnect?: boolean
}

interface WebSocketMessage {
  type: string
  projectId: string
  data: any
  timestamp: string
}

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

    const wsUrl =
      selectedProject.wsUrl || `${env.NEXT_PUBLIC_BRIDGE_WS_URL}/projects/${selectedProject.id}`

    logger.info('Connecting to project WebSocket', {
      projectId: selectedProject.id,
      url: wsUrl,
    })

    updateConnectionStatus(selectedProject.id, { bridge: 'connecting' })

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
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
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)

          // Route message based on type
          switch (message.type) {
            case 'telemetry':
              options.onTelemetry?.(message.data)
              break
            case 'agent_status':
              options.onAgentStatus?.(message.data)
              // Update store with agent activity
              if (message.data.agentActivity) {
                updateAgentActivity(selectedProject.id, message.data.agentActivity)
              }
              break
            case 'log':
              options.onLog?.(message.data)
              break
            case 'error':
              options.onError?.(new Error(message.data.message))
              break
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message', error as Error)
        }
      }

      ws.onerror = (event) => {
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

        // Attempt reconnection if not manually closed
        if (reconnectAttemptsRef.current < maxReconnectAttempts && options.autoConnect !== false) {
          reconnectAttemptsRef.current++
          logger.info(
            `Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectDelay * reconnectAttemptsRef.current)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Failed to connect after multiple attempts')
          updateConnectionStatus(selectedProject.id, {
            bridge: 'error',
            lastError: 'Max reconnection attempts reached',
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
  }, [selectedProject, options, updateConnectionStatus, updateAgentActivity])

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
    if (selectedProject && options.autoConnect !== false) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [selectedProject?.id]) // Only reconnect when project ID changes

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
