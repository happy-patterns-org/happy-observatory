import { POST } from './route'
import { NextRequest } from 'next/server'
import { vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/security/token-revocation', () => ({
  tokenRevocationStore: {
    revoke: vi.fn()
  }
}))

vi.mock('@/lib/security/audit-logger', () => ({
  logSecurityEvent: vi.fn(),
  getRequestMetadata: vi.fn().mockReturnValue({ ip: '127.0.0.1' })
}))

vi.mock('@/lib/security/auth-middleware', () => ({
  withAuth: vi.fn((handler) => {
    return async (request: NextRequest) => {
      // Mock auth context for authenticated requests
      const token = request.cookies.get('auth-token')?.value
      if (token === 'valid-jwt-token') {
        const authContext = {
          user: {
            userId: 'test-user',
            jti: 'jwt-123',
            exp: Math.floor(Date.now() / 1000) + 3600,
            permissions: ['read'],
            projectIds: []
          },
          hasPermission: vi.fn(),
          hasProjectAccess: vi.fn()
        }
        return handler(request, authContext)
      }
      // Return 401 for unauthenticated requests
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  })
}))

import { tokenRevocationStore } from '@/lib/security/token-revocation'

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully logs out with valid token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
    })
    request.cookies.set('auth-token', 'valid-jwt-token')

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, message: 'Logged out successfully' })
    
    // Check token was revoked
    expect(vi.mocked(tokenRevocationStore.revoke)).toHaveBeenCalledWith('jwt-123', expect.any(Number))
  })

  it('clears auth cookie on logout', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
    })
    request.cookies.set('auth-token', 'valid-jwt-token')

    const response = await POST(request)
    
    // Check that cookie was cleared (set to empty value with past expiry)
    const cookies = response.cookies.getAll()
    const authCookie = cookies.find(c => c.name === 'auth-token')
    expect(authCookie).toBeDefined()
    expect(authCookie?.value).toBe('')
    expect(authCookie?.expires?.getTime()).toBeLessThan(Date.now())
  })

  it('returns 401 without token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Authentication required' })
    expect(vi.mocked(tokenRevocationStore.revoke)).not.toHaveBeenCalled()
  })

  it('handles token revocation errors gracefully', async () => {
    vi.mocked(tokenRevocationStore.revoke).mockImplementation(() => {
      throw new Error('Revocation failed')
    })

    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
    })
    request.cookies.set('auth-token', 'valid-jwt-token')

    const response = await POST(request)
    const data = await response.json()

    // Should fail with 500 if revocation fails
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to logout' })
  })

  it('returns 401 for invalid token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
    })
    request.cookies.set('auth-token', 'invalid-token')

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Authentication required' })
  })
})