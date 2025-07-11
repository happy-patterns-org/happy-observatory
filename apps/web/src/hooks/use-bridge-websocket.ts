'use client'

import { type BridgeMessage, getBridgeWebSocket } from '@/lib/bridge-websocket'
import { useCallback, useEffect, useState } from 'react'

interface UseBridgeWebSocketOptions {
  onTelemetry?: (data: any) => void
  onAgentStatus?: (data: any) => void
  onLog?: (data: any) => void
  onError?: (error: any) => void
  autoConnect?: boolean
}

export function useBridgeWebSocket(options: UseBridgeWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<BridgeMessage | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    const ws = getBridgeWebSocket()

    // Set up event handlers
    const handleConnected = () => {
      setIsConnected(true)
      setConnectionError(null)
    }

    const handleDisconnected = () => {
      setIsConnected(false)
    }

    const handleMessage = (message: BridgeMessage) => {
      setLastMessage(message)
    }

    const handleError = (error: any) => {
      setConnectionError(error.message || 'WebSocket error')
      options.onError?.(error)
    }

    const handleTelemetry = (data: any) => {
      options.onTelemetry?.(data)
    }

    const handleAgentStatus = (data: any) => {
      options.onAgentStatus?.(data)
    }

    const handleLog = (data: any) => {
      options.onLog?.(data)
    }

    const handleMaxReconnectFailed = () => {
      setConnectionError('Failed to connect after multiple attempts')
    }

    // Register event listeners
    ws.on('connected', handleConnected)
    ws.on('disconnected', handleDisconnected)
    ws.on('message', handleMessage)
    ws.on('error', handleError)
    ws.on('telemetry', handleTelemetry)
    ws.on('agent_status', handleAgentStatus)
    ws.on('log', handleLog)
    ws.on('max_reconnect_failed', handleMaxReconnectFailed)

    // Auto-connect if enabled
    if (options.autoConnect !== false) {
      ws.connect()
    }

    // Cleanup
    return () => {
      ws.off('connected', handleConnected)
      ws.off('disconnected', handleDisconnected)
      ws.off('message', handleMessage)
      ws.off('error', handleError)
      ws.off('telemetry', handleTelemetry)
      ws.off('agent_status', handleAgentStatus)
      ws.off('log', handleLog)
      ws.off('max_reconnect_failed', handleMaxReconnectFailed)
    }
  }, [
    options.onTelemetry,
    options.onAgentStatus,
    options.onLog,
    options.onError,
    options.autoConnect,
  ])

  const connect = useCallback(() => {
    getBridgeWebSocket().connect()
  }, [])

  const disconnect = useCallback(() => {
    getBridgeWebSocket().disconnect()
  }, [])

  const sendMessage = useCallback((message: any) => {
    getBridgeWebSocket().send(message)
  }, [])

  return {
    isConnected,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    sendMessage,
  }
}
