import { GET } from './route'
import { NextRequest } from 'next/server'
import { vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/security/auth-middleware', () => ({
  withAuth: (handler: any) => (request: any) => handler(request, {
    isAuthenticated: true,
    user: { id: 'test-user', username: 'test', role: 'admin' },
    hasRole: () => true
  }),
  authenticateRequest: vi.fn().mockResolvedValue({
    isAuthenticated: true,
    user: { id: 'test-user', username: 'test', role: 'admin' }
  })
}))
vi.mock('@/lib/security/rate-limit', () => ({
  withRateLimit: (handler: any) => handler
}))
vi.mock('@/lib/env', () => ({
  env: { USE_REAL_DATA: false }
}))

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns list of projects', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('projects')
    expect(data.projects.length).toBeGreaterThan(0)
    expect(data.projects[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      path: expect.any(String),
    })
  })

  it('returns timestamp with response', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('timestamp')
  })
})