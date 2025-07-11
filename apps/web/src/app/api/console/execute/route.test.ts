import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

// Mock dependencies
vi.mock('@/config-adapter', () => ({
  default: {
    useRealData: false,
  },
  API_PATHS: {
    consoleExecute: (projectId: string) => `/api/projects/${projectId}/console/execute`,
  },
  getBridgeAPIUrl: (path: string) => `http://bridge-server${path}`,
}))

// Store original fetch and console.error
const originalFetch = global.fetch
const originalConsoleError = console.error

// Mock global fetch
const mockFetch = vi.fn()

beforeAll(() => {
  global.fetch = mockFetch
  console.error = vi.fn()
})

afterAll(() => {
  global.fetch = originalFetch
  console.error = originalConsoleError
})

describe('/api/console/execute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    const createRequest = (body: any) => {
      return new NextRequest('http://localhost:3000/api/console/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    }

    it('should execute help command successfully', async () => {
      const request = createRequest({
        command: 'help',
        projectPath: '/test/path',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        command: 'help',
        status: 'success',
        isRealData: false,
        source: 'mock',
      })
      expect(data.output).toContain('Happy DevKit Console Commands')
      expect(data.output).toContain('status')
      expect(data.output).toContain('agents')
      expect(data.timestamp).toBeDefined()
    })

    it('should execute status command', async () => {
      const request = createRequest({
        command: 'status',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        command: 'status',
        status: 'success',
      })
      expect(data.output).toContain('System Status')
      expect(data.output).toContain('Agents: 3 active')
      expect(data.output).toContain('Tasks: 42 completed')
    })

    it('should execute agents command', async () => {
      const request = createRequest({
        command: 'agents',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        command: 'agents',
        status: 'success',
      })
      expect(data.output).toContain('Active Agents')
      expect(data.output).toContain('Test Orchestrator')
      expect(data.output).toContain('Code Analyzer')
      expect(data.output).toContain('Performance Monitor')
    })

    it('should handle git commands', async () => {
      const gitCommands = ['git status', 'git log', 'git diff', 'git branch']

      for (const command of gitCommands) {
        const request = createRequest({
          command,
          projectPath: '/project/path',
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toMatchObject({
          command,
          status: 'success',
        })
        expect(data.output).toContain(`Executing: ${command}`)
        expect(data.output).toContain('[Mock] Command would be executed')
      }
    })

    it('should handle clear command', async () => {
      const request = createRequest({
        command: 'clear',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        command: 'clear',
        output: '',
        status: 'success',
      })
    })

    it('should handle unrecognized commands', async () => {
      const request = createRequest({
        command: 'unknown-command',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        command: 'unknown-command',
        status: 'error',
      })
      expect(data.output).toContain('[Mock] Command not recognized')
      expect(data.output).toContain("Type 'help' for available commands")
    })

    it('should require command field', async () => {
      const request = createRequest({
        projectPath: '/test/path',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Command is required',
      })
    })

    it('should handle empty command', async () => {
      const request = createRequest({
        command: '',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Command is required',
      })
    })

    it('should work without projectPath', async () => {
      const request = createRequest({
        command: 'status',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.command).toBe('status')
      expect(data.status).toBe('success')
    })

    it('should return ISO timestamp', async () => {
      const request = createRequest({
        command: 'status',
      })

      const response = await POST(request)
      const data = await response.json()

      // Check ISO 8601 format
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      
      // Verify it's a valid date
      const date = new Date(data.timestamp)
      expect(date.toString()).not.toBe('Invalid Date')
    })

    it('should execute via bridge server when useRealData is true', async () => {
      const config = await import('@/config-adapter')
      config.default.useRealData = true

      const mockBridgeResponse = {
        output: 'Real command output',
        status: 'success',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBridgeResponse,
      })

      const request = createRequest({
        command: 'test-command',
        projectPath: '/real/path',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://bridge-server/api/projects/devkit/console/execute',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            command: 'test-command',
            cwd: '/real/path',
          }),
        }
      )

      expect(data).toMatchObject({
        ...mockBridgeResponse,
        isRealData: true,
        source: 'bridge',
      })

      // Reset config
      config.default.useRealData = false
    })

    it('should fallback to mock when bridge server fails', async () => {
      const config = await import('@/config-adapter')
      config.default.useRealData = true

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const request = createRequest({
        command: 'status',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isRealData).toBe(false)
      expect(data.source).toBe('mock')
      expect(data.output).toContain('System Status')

      // Reset config
      config.default.useRealData = false
    })

    it('should fallback to mock when bridge server returns non-ok response', async () => {
      const config = await import('@/config-adapter')
      config.default.useRealData = true

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const request = createRequest({
        command: 'status',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isRealData).toBe(false)
      expect(data.source).toBe('mock')

      // Reset config
      config.default.useRealData = false
    })

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/console/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to execute command',
      })
    })

    it('should log errors', async () => {
      const consoleError = console.error as any
      
      const request = new NextRequest('http://localhost:3000/api/console/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      await POST(request)

      expect(consoleError).toHaveBeenCalledWith(
        'Error executing command:',
        expect.any(Error)
      )
    })

    it('should handle commands with special characters', async () => {
      const request = createRequest({
        command: 'echo "test with spaces & special chars!"',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.command).toBe('echo "test with spaces & special chars!"')
    })

    it('should handle very long commands', async () => {
      const longCommand = 'echo ' + 'x'.repeat(1000)
      const request = createRequest({
        command: longCommand,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.command).toBe(longCommand)
      expect(data.status).toBe('error')
      expect(data.output).toContain('Command not recognized')
    })

    it('should handle null projectPath', async () => {
      const request = createRequest({
        command: 'status',
        projectPath: null,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('success')
    })

    it('should handle commands with newlines', async () => {
      const request = createRequest({
        command: 'multi\nline\ncommand',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.command).toBe('multi\nline\ncommand')
      expect(data.status).toBe('error')
    })

    it('should include all required response fields', async () => {
      const request = createRequest({
        command: 'status',
      })

      const response = await POST(request)
      const data = await response.json()

      const requiredFields = ['command', 'output', 'status', 'timestamp', 'isRealData', 'source']
      requiredFields.forEach((field) => {
        expect(data).toHaveProperty(field)
      })
    })
  })
})