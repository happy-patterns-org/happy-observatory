import { POST } from './route'
import { NextRequest } from 'next/server'
import { vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/security/password', () => ({
  verifyPassword: vi.fn()
}))

vi.mock('@/lib/security/auth-middleware', () => ({
  generateToken: vi.fn()
}))

vi.mock('@/lib/security/audit-logger', () => ({
  logSecurityEvent: vi.fn(),
  getRequestMetadata: vi.fn().mockReturnValue({ ip: '127.0.0.1' })
}))

// Mock rate limiting to avoid 429 errors in tests
vi.mock('@/lib/security/rate-limit', () => ({
  withRateLimit: vi.fn((handler) => handler)
}))

import { verifyPassword } from '@/lib/security/password'
import { generateToken } from '@/lib/security/auth-middleware'

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default mock implementations
    vi.mocked(verifyPassword).mockResolvedValue(true)
    vi.mocked(generateToken).mockResolvedValue('test-jwt-token')
  })

  it('returns JWT token for valid credentials', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('token', 'test-jwt-token')
    expect(data).toHaveProperty('user')
    expect(data.user).toMatchObject({
      id: 'admin',
      permissions: ['admin', 'read', 'write'],
      projectIds: []
    })
    
    // Check token generation was called with correct payload
    expect(vi.mocked(generateToken)).toHaveBeenCalledWith({
      userId: 'admin',
      permissions: ['admin', 'read', 'write'],
      projectIds: []
    })
  })

  it('sets secure cookie with token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    })

    const response = await POST(request)
    
    // Check cookie was set
    const cookies = response.cookies.getAll()
    const authCookie = cookies.find(c => c.name === 'auth-token')
    expect(authCookie).toBeDefined()
    expect(authCookie?.value).toBe('test-jwt-token')
  })

  it('returns 401 for invalid username', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'nonexistent',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toHaveProperty('error', 'Invalid credentials')
  })

  it('returns 401 for invalid password', async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false)

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'wrongpassword',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toHaveProperty('error', 'Invalid credentials')
  })

  it('returns 400 for missing username', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toHaveProperty('error')
  })

  it('returns 400 for missing password', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toHaveProperty('error')
  })

  it('returns 500 for invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toHaveProperty('error', 'Internal server error')
  })

  it('handles password verification errors gracefully', async () => {
    vi.mocked(verifyPassword).mockRejectedValue(new Error('Password verification error'))

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toHaveProperty('error', 'Internal server error')
  })
})