import { GET } from './route'
import { NextRequest } from 'next/server'
import { vi } from 'vitest'

// Mock the diagnostics module
vi.mock('@/lib/diagnostics', () => ({
  runDiagnostics: vi.fn().mockResolvedValue({
    isHealthy: true,
    timestamp: new Date('2024-01-01T00:00:00Z'),
    diagnostics: [
      {
        check: 'server',
        status: 'pass',
        message: 'Server is running',
        details: { port: 3000 }
      },
      {
        check: 'environment',
        status: 'pass',
        message: 'Environment variables are valid',
        details: {}
      }
    ]
  })
}))

describe('GET /api/health', () => {
  it('returns healthy status with all required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(String),
      checks: expect.any(Array),
      environment: {
        nodeVersion: expect.any(String),
        platform: expect.any(String),
        env: expect.any(String),
      }
    })
  })

  it('includes check results', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(data.checks).toBeDefined()
    expect(data.checks).toHaveLength(2)
    expect(data.checks[0]).toMatchObject({
      passed: true,
      message: expect.any(String),
      details: expect.any(Object),
    })
  })

  it('includes environment information', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(data.environment).toBeDefined()
    expect(data.environment.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/)
    expect(data.environment.platform).toBeDefined()
    expect(data.environment.env).toBeDefined()
  })

  it('returns correct content type', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)

    expect(response.headers.get('content-type')).toContain('application/json')
  })
})