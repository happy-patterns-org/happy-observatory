import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

// Mock dependencies
vi.mock('@/config-adapter', () => ({
  default: {
    useRealData: false,
  },
  API_PATHS: {
    metrics: '/api/telemetry/metrics',
  },
  getBridgeAPIUrl: (path: string) => `http://bridge-server${path}`,
}))

vi.mock('@/lib/security/auth-middleware', () => ({
  withAuth: (handler: any) => handler,
}))

vi.mock('@/lib/security/config', () => ({
  securityConfig: {
    rateLimit: {
      api: {
        telemetry: {
          windowMs: 60000,
          max: 100,
        },
      },
    },
  },
}))

vi.mock('@/lib/security/rate-limit', () => ({
  withRateLimit: (handler: any) => handler,
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

describe('/api/telemetry/metrics', () => {
  let mockMathRandom: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockMathRandom = vi.spyOn(Math, 'random')
  })

  afterEach(() => {
    mockMathRandom.mockRestore()
  })

  describe('GET', () => {
    const createRequest = (params?: Record<string, string>) => {
      const url = new URL('http://localhost:3000/api/telemetry/metrics')
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, value)
        })
      }
      return new NextRequest(url, {
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

    it('should return mock metrics data', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('metrics')
      expect(data).toHaveProperty('isRealData', false)
      expect(data).toHaveProperty('source', 'mock')
      expect(data).toHaveProperty('timestamp')
    })

    it('should return correct metrics structure', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      // Check system metrics
      expect(data.metrics.system).toHaveProperty('cpu')
      expect(data.metrics.system).toHaveProperty('memory')
      expect(data.metrics.system).toHaveProperty('disk')
      expect(data.metrics.system).toHaveProperty('uptime', 86400)

      // Check agent metrics
      expect(data.metrics.agents).toHaveProperty('active')
      expect(data.metrics.agents).toHaveProperty('total', 8)
      expect(data.metrics.agents).toHaveProperty('tasks_completed')
      expect(data.metrics.agents).toHaveProperty('tasks_failed')
      expect(data.metrics.agents).toHaveProperty('success_rate')

      // Check performance metrics
      expect(data.metrics.performance).toHaveProperty('avg_response_time')
      expect(data.metrics.performance).toHaveProperty('throughput')
      expect(data.metrics.performance).toHaveProperty('queue_length')

      // Check timeline
      expect(data.metrics.timeline).toHaveLength(12)
    })

    it('should generate valid timeline data', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      const timeline = data.metrics.timeline
      expect(timeline).toHaveLength(12)

      timeline.forEach((point: any, index: number) => {
        expect(point).toHaveProperty('timestamp')
        expect(point).toHaveProperty('cpu')
        expect(point).toHaveProperty('memory')
        expect(point).toHaveProperty('active_agents')
        expect(point).toHaveProperty('tasks_per_minute')

        // Check timestamp is valid
        const timestamp = new Date(point.timestamp)
        expect(timestamp.toString()).not.toBe('Invalid Date')

        // Check timestamps are in order
        if (index > 0) {
          const prevTimestamp = new Date(timeline[index - 1].timestamp)
          expect(timestamp.getTime()).toBeGreaterThan(prevTimestamp.getTime())
        }
      })
    })

    it('should respect minutes query parameter', async () => {
      const request = createRequest({ minutes: '30' })
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics).toBeDefined()
    })

    it('should use default 60 minutes when no parameter provided', async () => {
      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics).toBeDefined()
    })

    it('should generate metrics within expected ranges', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      // System metrics ranges
      expect(data.metrics.system.cpu).toBeGreaterThanOrEqual(20)
      expect(data.metrics.system.cpu).toBeLessThan(50)
      expect(data.metrics.system.memory).toBeGreaterThanOrEqual(60)
      expect(data.metrics.system.memory).toBeLessThan(80)
      expect(data.metrics.system.disk).toBeGreaterThanOrEqual(40)
      expect(data.metrics.system.disk).toBeLessThan(80)

      // Agent metrics ranges
      expect(data.metrics.agents.active).toBeGreaterThanOrEqual(1)
      expect(data.metrics.agents.active).toBeLessThan(6)
      expect(data.metrics.agents.tasks_completed).toBeGreaterThanOrEqual(50)
      expect(data.metrics.agents.tasks_completed).toBeLessThan(150)
      expect(data.metrics.agents.success_rate).toBeGreaterThanOrEqual(0.95)
      expect(data.metrics.agents.success_rate).toBeLessThan(0.99)

      // Performance metrics ranges
      expect(data.metrics.performance.avg_response_time).toBeGreaterThanOrEqual(0.5)
      expect(data.metrics.performance.avg_response_time).toBeLessThan(2.5)
      expect(data.metrics.performance.throughput).toBeGreaterThanOrEqual(20)
      expect(data.metrics.performance.throughput).toBeLessThan(70)
    })

    it('should fetch from bridge server when useRealData is true', async () => {
      const config = await import('@/config-adapter')
      config.default.useRealData = true

      const mockBridgeResponse = {
        metrics: {
          system: { cpu: 45, memory: 72, disk: 56, uptime: 100000 },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBridgeResponse,
      })

      const request = createRequest({ minutes: '120' })
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://bridge-server/api/telemetry/metrics?minutes=120'
      )
      expect(data).toMatchObject({
        ...mockBridgeResponse,
        isRealData: true,
        source: 'bridge',
      })

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
      expect(data.isRealData).toBe(false)
      expect(data.source).toBe('mock')
      expect(data.metrics).toBeDefined()

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
      expect(data.isRealData).toBe(false)
      expect(data.source).toBe('mock')

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
        error: 'Failed to fetch telemetry metrics',
      })
    })

    it('should log errors', async () => {
      const consoleError = console.error as any
      
      mockMathRandom.mockImplementation(() => {
        throw new Error('Test error')
      })

      const request = createRequest()
      await GET(request, mockAuthContext as any)

      expect(consoleError).toHaveBeenCalledWith(
        'Error fetching telemetry metrics:',
        expect.any(Error)
      )
    })

    it('should return valid ISO timestamp', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      // Check ISO 8601 format
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      
      // Verify it's a valid date
      const date = new Date(data.timestamp)
      expect(date.toString()).not.toBe('Invalid Date')
    })

    it('should handle different random values correctly', async () => {
      // Test with minimum random values
      mockMathRandom.mockReturnValue(0)

      let request = createRequest()
      let response = await GET(request, mockAuthContext as any)
      let data = await response.json()

      expect(data.metrics.system.cpu).toBe(20)
      expect(data.metrics.system.memory).toBe(60)
      expect(data.metrics.agents.active).toBe(1)

      // Test with maximum random values
      mockMathRandom.mockReturnValue(0.999)

      request = createRequest()
      response = await GET(request, mockAuthContext as any)
      data = await response.json()

      expect(data.metrics.system.cpu).toBe(49)
      expect(data.metrics.system.memory).toBe(79)
      expect(data.metrics.agents.active).toBe(5)
    })

    it('should include all required fields in timeline entries', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      const requiredFields = ['timestamp', 'cpu', 'memory', 'active_agents', 'tasks_per_minute']
      
      data.metrics.timeline.forEach((entry: any) => {
        requiredFields.forEach((field) => {
          expect(entry).toHaveProperty(field)
        })
      })
    })

    it('should handle empty query string', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest({})
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics).toBeDefined()
    })

    it('should handle invalid query parameters gracefully', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest({ 
        minutes: 'invalid',
        extra: 'param',
      })
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics).toBeDefined()
    })

    it('should generate consistent uptime value', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(data.metrics.system.uptime).toBe(86400) // Always 24 hours
    })

    it('should generate consistent total agents value', async () => {
      mockMathRandom.mockReturnValue(0.5)

      const request = createRequest()
      const response = await GET(request, mockAuthContext as any)
      const data = await response.json()

      expect(data.metrics.agents.total).toBe(8) // Always 8 total agents
    })
  })
})