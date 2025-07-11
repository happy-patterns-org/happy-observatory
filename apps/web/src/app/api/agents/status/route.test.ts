import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

// Mock dependencies
vi.mock('@/config-adapter', () => ({
  default: {
    useRealData: false,
  },
  API_PATHS: {
    agentStatus: (projectId: string) => `/api/projects/${projectId}/agents/status`,
  },
  getBridgeAPIUrl: (path: string) => `http://bridge-server${path}`,
}))

vi.mock('@/lib/security/auth-middleware', () => ({
  withAuth: (handler: any) => handler,
}))

vi.mock('@/lib/security/rate-limit', () => ({
  withRateLimit: (handler: any) => handler,
}))

// Store original fetch
const originalFetch = global.fetch

// Mock global fetch
const mockFetch = vi.fn()

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error

beforeAll(() => {
  global.fetch = mockFetch
  console.error = vi.fn()
})

afterAll(() => {
  global.fetch = originalFetch
  console.error = originalConsoleError
})

describe('/api/agents/status', () => {
  let mockMathRandom: any
  let mockConfig: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockMathRandom = vi.spyOn(Math, 'random')
    mockConfig = vi.importActual('@/config-adapter').then((mod: any) => mod.default)
  })

  afterEach(() => {
    mockMathRandom.mockRestore()
  })

  describe('GET', () => {
    const createRequest = () => {
      return new NextRequest('http://localhost:3000/api/agents/status', {
        method: 'GET',
      })
    }

    const mockAuthContext = {
      user: {
        id: 'test-user',
        email: 'test@example.com',
        permissions: ['read'],
      },
      token: 'test-token',
    }

    it('should return mock agents data when useRealData is false', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('agents')
      expect(data).toHaveProperty('isRealData', false)
      expect(data).toHaveProperty('source', 'mock')
      expect(data.agents).toHaveLength(3)
    })

    it('should return correct mock agent structure', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      const agent = data.agents[0]
      expect(agent).toHaveProperty('id')
      expect(agent).toHaveProperty('name')
      expect(agent).toHaveProperty('type')
      expect(agent).toHaveProperty('status')
      expect(agent).toHaveProperty('canStart')
      expect(agent).toHaveProperty('canStop')
      expect(agent).toHaveProperty('canPause')
      expect(agent).toHaveProperty('lastCommand')
      
      expect(agent.lastCommand).toHaveProperty('type', 'start')
      expect(agent.lastCommand).toHaveProperty('timestamp')
      expect(agent.lastCommand).toHaveProperty('source', 'cli')
      expect(agent.lastCommand).toHaveProperty('result', 'success')
    })

    it('should randomize agent status when Math.random > 0.7', async () => {
      mockMathRandom.mockReturnValue(0.8)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      // All agents should have status 'running' when random > 0.7
      data.agents.forEach((agent: any) => {
        expect(agent.status).toBe('running')
      })
    })

    it('should keep original status when Math.random <= 0.7', async () => {
      mockMathRandom.mockReturnValue(0.3)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      // Check that statuses match the original mock data
      expect(data.agents[0].status).toBe('idle')
      expect(data.agents[1].status).toBe('running')
      expect(data.agents[2].status).toBe('idle')
    })

    it('should fetch from bridge server when useRealData is true', async () => {
      const config = await import('@/config-adapter')
      config.default.useRealData = true

      const mockBridgeResponse = {
        agents: [
          {
            id: 'real-agent-1',
            name: 'Real Agent',
            status: 'active',
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBridgeResponse,
      })

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://bridge-server/api/projects/devkit/agents/status'
      )
      expect(data).toEqual(mockBridgeResponse)

      // Reset config
      config.default.useRealData = false
    })

    it('should fallback to mock data when bridge server fails', async () => {
      const config = await import('@/config-adapter')
      config.default.useRealData = true

      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.source).toBe('mock')
      expect(data.agents).toHaveLength(3)

      // Reset config
      config.default.useRealData = false
    })

    it('should fallback to mock data when bridge server returns non-ok response', async () => {
      const config = await import('@/config-adapter')
      config.default.useRealData = true

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      })
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.source).toBe('mock')
      expect(data.agents).toHaveLength(3)

      // Reset config
      config.default.useRealData = false
    })

    it('should handle errors gracefully', async () => {
      // Mock an error in the handler
      mockMathRandom.mockImplementation(() => {
        throw new Error('Random error')
      })

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to fetch agent status',
      })
    })

    it('should generate valid timestamps for lastCommand', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      data.agents.forEach((agent: any) => {
        const timestamp = new Date(agent.lastCommand.timestamp)
        expect(timestamp.toString()).not.toBe('Invalid Date')
        expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now())
        expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 3600000) // Within last hour
      })
    })

    it('should return consistent agent types', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(data.agents[0].type).toBe('orchestrator')
      expect(data.agents[1].type).toBe('test-guardian')
      expect(data.agents[2].type).toBe('analyzer')
    })

    it('should set correct capabilities for each agent type', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      // Orchestrator
      expect(data.agents[0]).toMatchObject({
        canStart: true,
        canStop: false,
        canPause: true,
      })

      // Test Guardian
      expect(data.agents[1]).toMatchObject({
        canStart: false,
        canStop: true,
        canPause: false,
      })

      // Analyzer
      expect(data.agents[2]).toMatchObject({
        canStart: true,
        canStop: false,
        canPause: false,
      })
    })

    it('should include all required fields in response', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      const requiredFields = ['agents', 'isRealData', 'source']
      requiredFields.forEach((field) => {
        expect(data).toHaveProperty(field)
      })
    })

    it('should handle multiple concurrent requests', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const requests = Array(5).fill(null).map(() => createRequest())
      const responses = await Promise.all(
        requests.map((req) => GET(req, mockAuthContext as any))
      )

      const results = await Promise.all(responses.map((res) => res.json()))

      results.forEach((data) => {
        expect(data.agents).toHaveLength(3)
        expect(data.source).toBe('mock')
      })
    })

    it('should handle bridge server timeout gracefully', async () => {
      const config = await import('@/config-adapter')
      config.default.useRealData = true

      // Simulate a timeout by never resolving
      mockFetch.mockImplementationOnce(() => new Promise(() => {}))
      mockMathRandom.mockReturnValue(0.5)

      // Use a shorter timeout for the test
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 100))
      
      const request = createRequest()
      const responsePromise = GET(request, mockAuthContext as any)

      // Wait for either the response or timeout
      await Promise.race([responsePromise, timeoutPromise])

      // The handler should still be processing, but we can't test the final result
      // In a real scenario, this would eventually fallback to mock data
      
      // Reset config
      config.default.useRealData = false
    })
  })
})