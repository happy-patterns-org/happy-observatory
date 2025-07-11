import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { BridgeWebSocket, getBridgeWebSocket } from './bridge-websocket'
import type { BridgeMessage } from './bridge-websocket'

// Mock EventEmitter if needed
vi.mock('node:events', async () => {
  const actual = await vi.importActual('node:events')
  return actual
})

// Mock environment config
vi.mock('@/lib/config/environment', () => ({
  envConfig: {
    bridgeUrl: 'ws://localhost:8080/bridge',
  },
}))

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: any) => void) | null = null
  onclose: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null
  
  private openTimer: any

  constructor(public url: string) {
    // Simulate connection after a short delay
    this.openTimer = setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN
        this.onopen?.({})
      }
    }, 10)
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
  }

  close() {
    if (this.openTimer) {
      clearTimeout(this.openTimer)
    }
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({})
  }
}

// Setup WebSocket mock globally
beforeAll(() => {
  Object.defineProperty(global, 'WebSocket', {
    writable: true,
    value: MockWebSocket,
  })
})

afterAll(() => {
  Object.defineProperty(global, 'WebSocket', {
    writable: true,
    value: undefined,
  })
})

describe('BridgeWebSocket', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any
  let consoleWarnSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('Connection Management', () => {
    it('should connect to WebSocket server', async () => {
      const ws = new BridgeWebSocket()
      const connectedHandler = vi.fn()
      
      ws.on('connected', connectedHandler)
      ws.connect()
      
      // Wait for connection
      await vi.advanceTimersByTimeAsync(20)
      
      expect(connectedHandler).toHaveBeenCalled()
      expect(ws.isConnected()).toBe(true)
      
      ws.disconnect()
    })

    it('should use custom URL if provided', () => {
      const customUrl = 'ws://custom:9090/bridge'
      const ws = new BridgeWebSocket(customUrl)
      
      // Spy on WebSocket creation
      const WebSocketSpy = vi.spyOn(global, 'WebSocket' as any)
      
      ws.connect()
      
      expect(WebSocketSpy).toHaveBeenCalledWith(customUrl)
      
      ws.disconnect()
    })

    it('should not create multiple connections', async () => {
      const ws = new BridgeWebSocket()
      
      ws.connect()
      await vi.advanceTimersByTimeAsync(20)
      
      const firstWs = ws['ws']
      
      // Try to connect again
      ws.connect()
      
      expect(ws['ws']).toBe(firstWs)
      
      ws.disconnect()
    })

    it('should emit disconnected event on close', async () => {
      const ws = new BridgeWebSocket()
      const disconnectedHandler = vi.fn()
      
      ws.on('disconnected', disconnectedHandler)
      ws.connect()
      
      await vi.advanceTimersByTimeAsync(20)
      
      // Simulate WebSocket close
      ws['ws']?.close()
      
      expect(disconnectedHandler).toHaveBeenCalled()
      expect(ws.isConnected()).toBe(false)
    })

    it('should handle connection errors', () => {
      const ws = new BridgeWebSocket()
      const errorHandler = vi.fn()
      
      ws.on('error', errorHandler)
      
      // Mock WebSocket to throw error
      Object.defineProperty(global, 'WebSocket', {
        writable: true,
        value: vi.fn().mockImplementation(() => {
          throw new Error('Connection failed')
        }),
      })
      
      ws.connect()
      
      expect(errorHandler).toHaveBeenCalledWith(new Error('Connection failed'))
      
      // Restore mock
      Object.defineProperty(global, 'WebSocket', {
        writable: true,
        value: MockWebSocket,
      })
    })

    it('should throw error if URL is not defined', () => {
      const ws = new BridgeWebSocket(undefined as any)
      ws['wsUrl'] = undefined // Force URL to be undefined
      const errorHandler = vi.fn()
      
      ws.on('error', errorHandler)
      ws.connect()
      
      expect(errorHandler).toHaveBeenCalledWith(new Error('WebSocket URL is not defined'))
    })
  })

  describe('Message Handling', () => {
    it('should parse and emit incoming messages', async () => {
      const ws = new BridgeWebSocket()
      const messageHandler = vi.fn()
      const telemetryHandler = vi.fn()
      
      ws.on('message', messageHandler)
      ws.on('telemetry', telemetryHandler)
      
      ws.connect()
      await vi.advanceTimersByTimeAsync(20)
      
      const testMessage: BridgeMessage = {
        type: 'telemetry',
        data: { metric: 'cpu', value: 50 },
        timestamp: new Date().toISOString(),
      }
      
      // Simulate incoming message
      const websocket = ws['ws'] as MockWebSocket
      expect(websocket).toBeDefined()
      websocket.onmessage?.({
        data: JSON.stringify(testMessage),
      } as any)
      
      expect(messageHandler).toHaveBeenCalledWith(testMessage)
      expect(telemetryHandler).toHaveBeenCalledWith(testMessage.data)
      
      ws.disconnect()
    })

    it('should handle different message types', async () => {
      const ws = new BridgeWebSocket()
      const agentStatusHandler = vi.fn()
      const logHandler = vi.fn()
      const errorHandler = vi.fn()
      
      ws.on('agent_status', agentStatusHandler)
      ws.on('log', logHandler)
      ws.on('error', errorHandler)
      
      ws.connect()
      await vi.advanceTimersByTimeAsync(20)
      
      // Test agent_status message
      ws['ws']?.onmessage?.({
        data: JSON.stringify({
          type: 'agent_status',
          data: { agentId: 'agent-1', status: 'running' },
          timestamp: new Date().toISOString(),
        }),
      } as any)
      
      expect(agentStatusHandler).toHaveBeenCalledWith({
        agentId: 'agent-1',
        status: 'running',
      })
      
      // Test log message
      ws['ws']?.onmessage?.({
        data: JSON.stringify({
          type: 'log',
          data: { level: 'info', message: 'Test log' },
          timestamp: new Date().toISOString(),
        }),
      } as any)
      
      expect(logHandler).toHaveBeenCalledWith({
        level: 'info',
        message: 'Test log',
      })
      
      ws.disconnect()
    })

    it('should handle malformed messages gracefully', async () => {
      const ws = new BridgeWebSocket()
      const messageHandler = vi.fn()
      
      ws.on('message', messageHandler)
      
      ws.connect()
      await vi.advanceTimersByTimeAsync(20)
      
      // Send malformed JSON
      ws['ws']?.onmessage?.({
        data: 'invalid json',
      } as any)
      
      expect(messageHandler).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse WebSocket message:',
        expect.any(Error)
      )
      
      ws.disconnect()
    })
  })

  describe('Sending Messages', () => {
    it('should send messages when connected', async () => {
      const ws = new BridgeWebSocket()
      
      ws.connect()
      await vi.advanceTimersByTimeAsync(20)
      
      const sendSpy = vi.spyOn(ws['ws']!, 'send')
      const testMessage = { type: 'test', data: 'hello' }
      
      ws.send(testMessage)
      
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(testMessage))
      
      ws.disconnect()
    })

    it('should warn when trying to send while disconnected', () => {
      const ws = new BridgeWebSocket()
      
      ws.send({ type: 'test' })
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cannot send message: WebSocket is not connected'
      )
    })
  })

  describe('Ping/Keep-Alive', () => {
    it('should start ping interval on connection', async () => {
      const ws = new BridgeWebSocket()
      
      ws.connect()
      await vi.advanceTimersByTimeAsync(20)
      
      const sendSpy = vi.spyOn(ws, 'send')
      
      // Advance time to trigger ping (30 seconds)
      await vi.advanceTimersByTimeAsync(30000)
      
      expect(sendSpy).toHaveBeenCalledWith({ type: 'ping' })
      
      ws.disconnect()
    })

    it('should stop ping interval on disconnect', async () => {
      const ws = new BridgeWebSocket()
      
      ws.connect()
      await vi.advanceTimersByTimeAsync(20)
      
      const sendSpy = vi.spyOn(ws, 'send')
      
      ws.disconnect()
      
      // Advance time past ping interval
      await vi.advanceTimersByTimeAsync(60000)
      
      expect(sendSpy).not.toHaveBeenCalled()
    })
  })

  describe('Reconnection Logic', () => {
    it('should attempt to reconnect on unintentional disconnect', async () => {
      const ws = new BridgeWebSocket()
      
      ws.connect()
      await vi.advanceTimersByTimeAsync(20)
      
      const connectSpy = vi.spyOn(ws, 'connect')
      
      // Simulate unintentional disconnect
      ws['ws']?.onclose?.({})
      
      // Advance time for reconnect delay (1 second for first attempt)
      await vi.advanceTimersByTimeAsync(1000)
      
      expect(connectSpy).toHaveBeenCalledTimes(2) // Initial + reconnect
      
      ws.disconnect()
    })

    it('should not reconnect on intentional disconnect', async () => {
      const ws = new BridgeWebSocket()
      
      ws.connect()
      await vi.advanceTimersByTimeAsync(20)
      
      const connectSpy = vi.spyOn(ws, 'connect')
      
      // Intentional disconnect
      ws.disconnect()
      
      // Advance time
      await vi.advanceTimersByTimeAsync(5000)
      
      expect(connectSpy).toHaveBeenCalledTimes(1) // Only initial connect
    })

    it('should use exponential backoff for reconnects', async () => {
      const ws = new BridgeWebSocket()
      
      // Mock WebSocket to always fail after first connection
      let attemptCount = 0
      Object.defineProperty(global, 'WebSocket', {
        writable: true,
        value: vi.fn().mockImplementation(() => {
          attemptCount++
          if (attemptCount > 1) {
            throw new Error('Connection failed')
          }
          return new MockWebSocket('ws://test')
        }),
      })
      
      ws.connect()
      
      // First reconnect after 1 second
      await vi.advanceTimersByTimeAsync(1000)
      expect(attemptCount).toBe(2)
      
      // Second reconnect after 2 seconds
      await vi.advanceTimersByTimeAsync(2000)
      expect(attemptCount).toBe(3)
      
      // Third reconnect after 4 seconds
      await vi.advanceTimersByTimeAsync(4000)
      expect(attemptCount).toBe(4)
      
      ws.disconnect()
      
      // Restore mock
      Object.defineProperty(global, 'WebSocket', {
        writable: true,
        value: MockWebSocket,
      })
    })

    it('should emit max_reconnect_failed after max attempts', async () => {
      const ws = new BridgeWebSocket()
      const maxReconnectHandler = vi.fn()
      
      ws.on('max_reconnect_failed', maxReconnectHandler)
      
      // Mock WebSocket to always fail
      Object.defineProperty(global, 'WebSocket', {
        writable: true,
        value: vi.fn().mockImplementation(() => {
          throw new Error('Connection failed')
        }),
      })
      
      ws.connect()
      
      // Advance through all reconnect attempts
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(30000) // Max delay
      }
      
      expect(maxReconnectHandler).toHaveBeenCalled()
      
      // Restore mock
      Object.defineProperty(global, 'WebSocket', {
        writable: true,
        value: MockWebSocket,
      })
    })

    it('should cap reconnect delay at 30 seconds', async () => {
      const ws = new BridgeWebSocket()
      
      // Set reconnect attempts to high number
      ws['reconnectAttempts'] = 8
      
      // Mock to capture timeout delay
      let capturedDelay = 0
      const originalSetTimeout = global.setTimeout
      global.setTimeout = vi.fn().mockImplementation((fn, delay) => {
        capturedDelay = delay as number
        return originalSetTimeout(fn, 0)
      })
      
      ws['scheduleReconnect']()
      
      expect(capturedDelay).toBe(30000)
      
      ws.disconnect()
    })
  })

  describe('WebSocket Error Handling', () => {
    it('should emit error events from WebSocket', async () => {
      const ws = new BridgeWebSocket()
      const errorHandler = vi.fn()
      
      ws.on('error', errorHandler)
      ws.connect()
      
      await vi.advanceTimersByTimeAsync(20)
      
      const testError = new Error('WebSocket error')
      ws['ws']?.onerror?.(testError as any)
      
      expect(errorHandler).toHaveBeenCalledWith(testError)
      
      ws.disconnect()
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const ws1 = getBridgeWebSocket()
      const ws2 = getBridgeWebSocket()
      
      expect(ws1).toBe(ws2)
    })
  })
})