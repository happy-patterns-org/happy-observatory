import { createAuthMiddleware, generateToken, withAuth, type AuthContext, type AuthToken } from './auth-middleware'
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { checkTokenRevocation } from './token-revocation'
import { vi } from 'vitest'
import { securityConfig } from './config'

// Mock dependencies
vi.mock('jose')
vi.mock('./token-revocation', () => ({
  checkTokenRevocation: vi.fn().mockResolvedValue(true)
}))

describe('auth-middleware', () => {
  const validPayload: AuthToken = {
    userId: 'user-123',
    projectIds: ['project-1', 'project-2'],
    permissions: ['read', 'write'],
    exp: Math.floor(Date.now() / 1000) + 3600,
    jti: 'jwt-123',
  }

  const mockJwtVerifyResult = {
    payload: validPayload,
    protectedHeader: {}
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
    vi.mocked(jose.jwtVerify).mockResolvedValue(mockJwtVerifyResult as any)
    vi.mocked(checkTokenRevocation).mockResolvedValue(true) // Token is valid (not revoked)
  })

  describe('createAuthMiddleware', () => {
    const mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ message: 'success' })
    )

    it('authenticates request with valid token in cookie', async () => {
      const middleware = createAuthMiddleware('required')
      const request = new NextRequest('http://localhost:3000/api/protected')
      // Set cookie on the request
      request.cookies.set('auth-token', 'valid-jwt-token')

      const response = await middleware(request, mockHandler)

      expect(mockHandler).toHaveBeenCalledWith(request, expect.objectContaining({
        user: validPayload,
        hasPermission: expect.any(Function),
        hasProjectAccess: expect.any(Function),
      }))
      expect(response.status).toBe(200)
    })

    it('authenticates request with bearer token', async () => {
      const middleware = createAuthMiddleware('required')
      const request = new NextRequest('http://localhost:3000/api/protected', {
        headers: {
          Authorization: 'Bearer valid-jwt-token',
        },
      })

      await middleware(request, mockHandler)

      expect(mockHandler).toHaveBeenCalledWith(request, expect.objectContaining({
        user: validPayload,
        hasPermission: expect.any(Function),
        hasProjectAccess: expect.any(Function),
      }))
    })

    it('rejects request without token in required mode', async () => {
      const middleware = createAuthMiddleware('required')
      const request = new NextRequest('http://localhost:3000/api/protected')

      const response = await middleware(request, mockHandler)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Authentication required')
    })

    it('allows request without token in optional mode', async () => {
      const middleware = createAuthMiddleware('optional')
      const request = new NextRequest('http://localhost:3000/api/protected')

      const response = await middleware(request, mockHandler)

      expect(mockHandler).toHaveBeenCalledWith(request)
      expect(response.status).toBe(200)
    })

    it('skips auth entirely in none mode', async () => {
      const middleware = createAuthMiddleware('none')
      const request = new NextRequest('http://localhost:3000/api/protected')

      await middleware(request, mockHandler)

      expect(mockHandler).toHaveBeenCalledWith(request)
      expect(vi.mocked(jose.jwtVerify)).not.toHaveBeenCalled()
    })

    it('rejects invalid token', async () => {
      vi.mocked(jose.jwtVerify).mockRejectedValue(new Error('Invalid token'))
      const middleware = createAuthMiddleware('required')
      const request = new NextRequest('http://localhost:3000/api/protected', {
        headers: {
          Cookie: 'auth-token=invalid-token',
        },
      })

      const response = await middleware(request, mockHandler)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })

    it('rejects revoked token', async () => {
      vi.mocked(checkTokenRevocation).mockResolvedValue(false) // Token is revoked
      const middleware = createAuthMiddleware('required')
      const request = new NextRequest('http://localhost:3000/api/protected')
      request.cookies.set('auth-token', 'valid-jwt-token')

      const response = await middleware(request, mockHandler)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })
  })

  describe('withAuth wrapper', () => {
    it('wraps handler with authentication', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = withAuth(handler)

      const request = new NextRequest('http://localhost:3000/api/protected')
      request.cookies.set('auth-token', 'valid-jwt-token')

      const response = await wrappedHandler(request)

      expect(handler).toHaveBeenCalledWith(request, expect.objectContaining({
        user: validPayload,
        hasPermission: expect.any(Function),
        hasProjectAccess: expect.any(Function),
      }))
      expect(response.status).toBe(200)
    })
  })

  describe('AuthContext methods', () => {
    it('hasPermission checks permissions correctly', async () => {
      const middleware = createAuthMiddleware('required')
      const request = new NextRequest('http://localhost:3000/api/protected', {
        headers: {
          Cookie: 'auth-token=valid-jwt-token',
        },
      })

      let capturedContext: AuthContext | undefined

      await middleware(request, async (_req, context) => {
        capturedContext = context
        return NextResponse.json({ success: true })
      })

      expect(capturedContext).toBeDefined()
      expect(capturedContext!.hasPermission('read')).toBe(true)
      expect(capturedContext!.hasPermission('write')).toBe(true)
      expect(capturedContext!.hasPermission('admin')).toBe(false)
    })

    it('hasProjectAccess checks project access correctly', async () => {
      const middleware = createAuthMiddleware('required')
      const request = new NextRequest('http://localhost:3000/api/protected', {
        headers: {
          Cookie: 'auth-token=valid-jwt-token',
        },
      })

      let capturedContext: AuthContext | undefined

      await middleware(request, async (_req, context) => {
        capturedContext = context
        return NextResponse.json({ success: true })
      })

      expect(capturedContext).toBeDefined()
      expect(capturedContext!.hasProjectAccess('project-1')).toBe(true)
      expect(capturedContext!.hasProjectAccess('project-2')).toBe(true)
      expect(capturedContext!.hasProjectAccess('project-3')).toBe(false)
    })

    it('admin permission grants access to all projects', async () => {
      const adminPayload: AuthToken = {
        ...validPayload,
        permissions: ['admin'],
      }
      vi.mocked(jose.jwtVerify).mockResolvedValue({
        payload: adminPayload,
        protectedHeader: {}
      } as any)

      const middleware = createAuthMiddleware('required')
      const request = new NextRequest('http://localhost:3000/api/protected', {
        headers: {
          Cookie: 'auth-token=valid-jwt-token',
        },
      })

      let capturedContext: AuthContext | undefined

      await middleware(request, async (_req, context) => {
        capturedContext = context
        return NextResponse.json({ success: true })
      })

      expect(capturedContext).toBeDefined()
      expect(capturedContext!.hasProjectAccess('any-project')).toBe(true)
    })
  })

  describe('generateToken', () => {
    it('generates a valid JWT token', async () => {
      const mockSign = vi.fn().mockResolvedValue('generated-token')
      const mockSignJWT = {
        setProtectedHeader: vi.fn().mockReturnThis(),
        setIssuedAt: vi.fn().mockReturnThis(),
        sign: mockSign,
      }
      
      // Mock the jose module to return our mock SignJWT
      vi.mocked(jose).SignJWT = vi.fn().mockImplementation(() => mockSignJWT) as any

      const payload = {
        userId: 'user-123',
        projectIds: ['project-1'],
        permissions: ['read'],
      }

      const token = await generateToken(payload)

      expect(token).toBe('generated-token')
      expect(mockSignJWT.setProtectedHeader).toHaveBeenCalledWith({ alg: 'HS256' })
      expect(mockSignJWT.setIssuedAt).toHaveBeenCalled()
      expect(mockSign).toHaveBeenCalled()
    })
  })
})