import { vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

// Mock dependencies
vi.mock('@/lib/logger-server', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/security/auth-middleware', () => ({
  withAuth: (handler: any) => handler,
}))

vi.mock('@/lib/security/rate-limit', () => ({
  withRateLimit: (handler: any) => handler,
}))

describe('/api/agents/command', () => {
  let mockMathRandom: any

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock Math.random to control test outcomes
    mockMathRandom = vi.spyOn(Math, 'random')
  })

  afterEach(() => {
    mockMathRandom.mockRestore()
  })

  describe('POST', () => {
    const createRequest = (body: any) => {
      return new NextRequest('http://localhost:3000/api/agents/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    }

    const mockAuthContext = {
      user: {
        id: 'test-user',
        email: 'test@example.com',
        permissions: ['write'],
      },
      token: 'test-token',
    }

    it('should execute command successfully', async () => {
      mockMathRandom.mockReturnValue(0.5) // No failure

      const request = createRequest({
        agentId: 'agent-123',
        command: 'start',
        parameters: { option: 'value' },
        source: 'dashboard',
      })

      const response = await POST(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        success: true,
        agentId: 'agent-123',
        command: 'start',
        output: 'Successfully executed start on agent agent-123',
      })
      expect(data.executedAt).toBeDefined()
    })

    it('should require agentId field', async () => {
      const request = createRequest({
        command: 'start',
      })

      const response = await POST(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Missing required fields: agentId and command',
      })
    })

    it('should require command field', async () => {
      const request = createRequest({
        agentId: 'agent-123',
      })

      const response = await POST(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Missing required fields: agentId and command',
      })
    })

    it('should handle command execution with minimal parameters', async () => {
      mockMathRandom.mockReturnValue(0.5) // No failure

      const request = createRequest({
        agentId: 'agent-123',
        command: 'stop',
      })

      const response = await POST(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        success: true,
        agentId: 'agent-123',
        command: 'stop',
      })
    })

    it('should log command execution', async () => {
      mockMathRandom.mockReturnValue(0.5) // No failure
      const { logger } = await import('@/lib/logger-server')

      const request = createRequest({
        agentId: 'agent-123',
        command: 'pause',
        parameters: { duration: 5000 },
        source: 'cli',
      })

      await POST(request, mockAuthContext as any)

      expect(logger.info).toHaveBeenCalledWith('Agent command received', {
        agentId: 'agent-123',
        command: 'pause',
        source: 'cli',
        parameters: { duration: 5000 },
      })
    })

    it('should simulate occasional failures', async () => {
      mockMathRandom.mockReturnValue(0.05) // Trigger failure

      const request = createRequest({
        agentId: 'agent-123',
        command: 'start',
      })

      const response = await POST(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Command execution failed: Agent not responding',
      })
    })

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/agents/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      const response = await POST(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to execute command',
      })
    })

    it('should log errors when command execution fails', async () => {
      const { logger } = await import('@/lib/logger-server')
      
      const request = new NextRequest('http://localhost:3000/api/agents/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      await POST(request, mockAuthContext as any)

      expect(logger.error).toHaveBeenCalledWith(
        'Error executing agent command',
        expect.any(Error)
      )
    })

    it('should handle different command types', async () => {
      mockMathRandom.mockReturnValue(0.5) // No failure

      const commands = ['start', 'stop', 'pause', 'resume', 'restart', 'status']
      
      for (const command of commands) {
        const request = createRequest({
          agentId: 'agent-test',
          command,
        })

        const response = await POST(request, mockAuthContext as any)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.command).toBe(command)
        expect(data.output).toContain(command)
      }
    })

    it('should handle complex parameters', async () => {
      mockMathRandom.mockReturnValue(0.5) // No failure

      const request = createRequest({
        agentId: 'agent-123',
        command: 'configure',
        parameters: {
          config: {
            maxRetries: 3,
            timeout: 30000,
            features: ['logging', 'monitoring'],
          },
          nested: {
            deep: {
              value: 'test',
            },
          },
        },
        source: 'api',
      })

      const response = await POST(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        success: true,
        agentId: 'agent-123',
        command: 'configure',
      })
    })

    it('should handle special characters in agentId', async () => {
      mockMathRandom.mockReturnValue(0.5) // No failure

      const request = createRequest({
        agentId: 'agent-123@special#chars',
        command: 'start',
      })

      const response = await POST(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agentId).toBe('agent-123@special#chars')
    })

    it('should return consistent timestamp format', async () => {
      mockMathRandom.mockReturnValue(0.5) // No failure

      const request = createRequest({
        agentId: 'agent-123',
        command: 'start',
      })

      const response = await POST(request, mockAuthContext as any)
      const data = await response.json()

      // Check ISO 8601 format
      expect(data.executedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      
      // Verify it's a valid date
      const date = new Date(data.executedAt)
      expect(date.toString()).not.toBe('Invalid Date')
    })

    it('should handle empty parameters object', async () => {
      mockMathRandom.mockReturnValue(0.5) // No failure

      const request = createRequest({
        agentId: 'agent-123',
        command: 'status',
        parameters: {},
      })

      const response = await POST(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle null parameters', async () => {
      mockMathRandom.mockReturnValue(0.5) // No failure

      const request = createRequest({
        agentId: 'agent-123',
        command: 'status',
        parameters: null,
      })

      const response = await POST(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle very long agent IDs', async () => {
      mockMathRandom.mockReturnValue(0.5) // No failure

      const longAgentId = 'agent-' + 'x'.repeat(1000)
      const request = createRequest({
        agentId: longAgentId,
        command: 'start',
      })

      const response = await POST(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.agentId).toBe(longAgentId)
    })
  })
})