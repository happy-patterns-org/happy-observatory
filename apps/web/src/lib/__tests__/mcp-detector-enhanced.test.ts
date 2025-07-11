import type { Project } from '@/store/project-store'
import { MCPWebSocketConnection, detectMCPServer } from '../mcp-detector-enhanced'
import { vi } from 'vitest'


// Mock fetch
global.fetch = vi.fn()

// Define WebSocket constants
const WS_CONNECTING = 0
const WS_OPEN = 1
const WS_CLOSING = 2
const WS_CLOSED = 3

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = WS_CONNECTING
  static OPEN = WS_OPEN
  static CLOSING = WS_CLOSING
  static CLOSED = WS_CLOSED

  readyState: number = WS_CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = WS_OPEN
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(_data: string) {
    // Mock implementation
  }

  close() {
    this.readyState = WS_CLOSED
    if (this.onclose) {
      // Simulate async close event
      setTimeout(() => {
        this.onclose?.(new CloseEvent('close'))
      }, 0)
    }
  }
}

// @ts-ignore
global.WebSocket = MockWebSocket

describe('MCP Detector Enhanced', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('detectMCPServer', () => {
    it('should detect MCP server on common ports', async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === 'http://localhost:5173/mcp/health') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                config: { name: 'Test MCP Server', version: '1.0.0' },
              }),
          })
        }
        return Promise.reject(new Error('Not found'))
      })

      const result = await detectMCPServer('/test/project')

      expect(result.isAvailable).toBe(true)
      expect(result.serverUrl).toBe('http://localhost:5173')
      expect(result.config?.name).toBe('Test MCP Server')
    })

    it('should handle timeout gracefully', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100)
        })
      })

      const result = await detectMCPServer('/test/project', {
        timeout: 50,
      })

      expect(result.isAvailable).toBe(false)
    })

    it('should check submodules when no server found on ports', async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/projects/check-submodules') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                hasMCPSubmodule: true,
                mcpServerUrl: 'http://localhost:8080',
              }),
          })
        }
        return Promise.reject(new Error('Not found'))
      })

      const result = await detectMCPServer('/test/project')

      expect(result.isAvailable).toBe(true)
      expect(result.serverUrl).toBe('http://localhost:8080')
    })

    it('should validate MCP server URLs', async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/projects/check-submodules') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                hasMCPSubmodule: true,
                mcpServerUrl: 'http://external.com:8080', // Invalid external URL
              }),
          })
        }
        return Promise.reject(new Error('Not found'))
      })

      const result = await detectMCPServer('/test/project')

      expect(result.isAvailable).toBe(false)
    })

    it('should return isAvailable false on error', async () => {
      // Simply test that errors are handled gracefully
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await detectMCPServer('/test/project')

      expect(result.isAvailable).toBe(false)
    })
  })

  describe('MCPWebSocketConnection', () => {
    const mockProject: Project = {
      id: 'test-id',
      name: 'Test Project',
      path: '/test/path',
      mcpServerUrl: 'http://localhost:5173',
    }

    it('should establish WebSocket connection', async () => {
      const onMessage = vi.fn()
      const connection = new MCPWebSocketConnection(mockProject, onMessage)

      const connected = await connection.connect()

      expect(connected).toBe(true)
      expect(connection.isConnected).toBe(true)
    })

    it('should throw error for missing server URL', async () => {
      const { mcpServerUrl, ...projectWithoutUrl } = mockProject
      const connection = new MCPWebSocketConnection(projectWithoutUrl, vi.fn())

      await expect(connection.connect()).rejects.toThrow('No MCP server URL')
    })

    it('should validate server URL', async () => {
      const projectWithInvalidUrl = {
        ...mockProject,
        mcpServerUrl: 'http://external.com:5173',
      }
      const connection = new MCPWebSocketConnection(projectWithInvalidUrl, vi.fn())

      await expect(connection.connect()).rejects.toThrow('Invalid MCP server URL')
    })

    it('should handle connection timeout', async () => {
      // Override MockWebSocket to not connect
      const OriginalMockWebSocket = global.WebSocket
      ;(global as any).WebSocket = class extends EventTarget {
        static CONNECTING = WS_CONNECTING
        static OPEN = WS_OPEN
        static CLOSING = WS_CLOSING
        static CLOSED = WS_CLOSED

        readyState = WS_CONNECTING
        url: string
        onopen: ((event: Event) => void) | null = null
        onclose: ((event: CloseEvent) => void) | null = null
        onerror: ((event: Event) => void) | null = null
        onmessage: ((event: MessageEvent) => void) | null = null

        constructor(url: string) {
          super()
          this.url = url
          // Don't trigger onopen - simulate timeout
        }

        send(_data: string) {}
        close() {
          this.readyState = WS_CLOSED
        }
      }

      const connection = new MCPWebSocketConnection(mockProject, vi.fn(), {
        timeout: 100,
      })

      await expect(connection.connect()).rejects.toThrow('Connection timeout')

      // Restore
      global.WebSocket = OriginalMockWebSocket
    })

    it('should send registration message on connect', async () => {
      const connection = new MCPWebSocketConnection(mockProject, vi.fn())
      let sentData: string | null = null

      // Mock send method
      const OriginalMockWebSocket = global.WebSocket
      ;(global as any).WebSocket = class extends MockWebSocket {
        send(data: string) {
          sentData = data
        }
      }

      await connection.connect()

      expect(sentData).toBeTruthy()
      const parsed = JSON.parse(sentData!)
      expect(parsed).toEqual({
        type: 'register',
        projectId: 'devkit', // Always uses 'devkit' as backend only knows this project
        projectPath: mockProject.path,
      })

      // Restore
      global.WebSocket = OriginalMockWebSocket
    })

    it('should handle incoming messages', async () => {
      const onMessage = vi.fn()
      const connection = new MCPWebSocketConnection(mockProject, onMessage)

      await connection.connect()

      // Simulate incoming message
      const ws = (connection as any).ws as MockWebSocket
      const testMessage = { type: 'test', data: 'hello' }
      ws.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify(testMessage),
        })
      )

      expect(onMessage).toHaveBeenCalledWith(testMessage)
    })

    it('should ignore pong messages', async () => {
      const onMessage = vi.fn()
      const connection = new MCPWebSocketConnection(mockProject, onMessage)

      await connection.connect()

      // Simulate pong message
      const ws = (connection as any).ws as MockWebSocket
      ws.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'pong' }),
        })
      )

      expect(onMessage).not.toHaveBeenCalled()
    })

    it('should implement retry logic', async () => {
      const onRetry = vi.fn()
      const connection = new MCPWebSocketConnection(mockProject, vi.fn(), {
        maxRetries: 2,
        retryDelay: 10,
        onRetry,
      })

      await connection.connect()

      // Simulate connection loss
      const ws = (connection as any).ws as MockWebSocket
      ws.close()

      // Wait for retry
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onRetry).toHaveBeenCalled()
    })

    it.skip('should stop retrying after max attempts', async () => {
      const onRetry = vi.fn()
      let connectAttempt = 0

      // Mock WebSocket that tracks connections
      const OriginalMockWebSocket = global.WebSocket
      class FailingWebSocket {
        static CONNECTING = WS_CONNECTING
        static OPEN = WS_OPEN
        static CLOSING = WS_CLOSING
        static CLOSED = WS_CLOSED

        readyState: number = WS_CONNECTING
        url: string
        onopen: ((event: Event) => void) | null = null
        onclose: ((event: CloseEvent) => void) | null = null
        onerror: ((event: Event) => void) | null = null
        onmessage: ((event: MessageEvent) => void) | null = null

        constructor(url: string) {
          this.url = url
          connectAttempt++

          // Don't open - just close immediately
          setTimeout(() => {
            this.readyState = WS_CLOSED
            this.onclose?.(new CloseEvent('close'))
          }, 5)
        }

        send(_data: string) {}
        close() {
          this.readyState = WS_CLOSED
        }
      }
      ;(global as any).WebSocket = FailingWebSocket

      const connection = new MCPWebSocketConnection(mockProject, vi.fn(), {
        maxRetries: 2,
        retryDelay: 10,
        onRetry,
        timeout: 50, // Short timeout
      })

      // Initial connection will fail, but might throw after retries
      let error: Error | null = null
      try {
        await connection.connect()
      } catch (e) {
        error = e as Error
      }

      expect(error).toBeTruthy()
      expect(error?.message).toContain('Failed to connect after retries')

      // Wait for retries to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should have made 3 total attempts (initial + 2 retries)
      expect(connectAttempt).toBe(3)
      expect(onRetry).toHaveBeenCalledTimes(2)

      // Restore
      global.WebSocket = OriginalMockWebSocket
    })

    it.skip('should close connection properly', async () => {
      const connection = new MCPWebSocketConnection(mockProject, vi.fn())

      await connection.connect()
      expect(connection.isConnected).toBe(true)

      // Store reference to ws before closing
      const ws = (connection as any).ws as MockWebSocket
      expect(ws).toBeTruthy()
      expect(ws.readyState).toBe(WebSocket.OPEN)

      connection.close()

      // After close:
      // 1. Should be marked as intentionally closed
      expect((connection as any).isIntentionallyClosed).toBe(true)
      // 2. WebSocket reference should be nulled
      expect((connection as any).ws).toBeNull()
      // 3. isConnected should return false (because ws is null)
      expect(connection.isConnected).toBe(false)
      // 4. The actual WebSocket should be closed
      expect(ws.readyState).toBe(WebSocket.CLOSED)
    })

    it('should not reconnect after intentional close', async () => {
      const onRetry = vi.fn()
      let closeEventFired = false

      // Create a custom mock that tracks close events
      const OriginalMockWebSocket = global.WebSocket
      class TrackingWebSocket extends MockWebSocket {
        static CONNECTING = WS_CONNECTING
        static OPEN = WS_OPEN
        static CLOSING = WS_CLOSING
        static CLOSED = WS_CLOSED
        constructor(url: string) {
          super(url)
          // Override onclose setter to track when it's called
          Object.defineProperty(this, 'onclose', {
            set: (handler) => {
              this._oncloseHandler = (event: CloseEvent) => {
                closeEventFired = true
                handler?.(event)
              }
            },
            get: () => this._oncloseHandler,
          })
        }

        private _oncloseHandler: ((event: CloseEvent) => void) | null = null

        close() {
          super.close()
          // Simulate the close event
          if (this._oncloseHandler) {
            setTimeout(() => {
              this._oncloseHandler?.(new CloseEvent('close'))
            }, 0)
          }
        }
      }
      ;(global as any).WebSocket = TrackingWebSocket

      const connection = new MCPWebSocketConnection(mockProject, vi.fn(), {
        onRetry,
        retryDelay: 10,
      })

      await connection.connect()

      // Close intentionally
      connection.close()

      // Wait for any async operations
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify:
      // 1. It's marked as intentionally closed
      expect((connection as any).isIntentionallyClosed).toBe(true)
      // 2. Close event was fired
      expect(closeEventFired).toBe(true)
      // 3. No retry was attempted
      expect(onRetry).not.toHaveBeenCalled()

      // Restore
      global.WebSocket = OriginalMockWebSocket
    })
  })
})
