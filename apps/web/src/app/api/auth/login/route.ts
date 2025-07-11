import { logger } from '@/lib/logger-server'
import { getRequestMetadata, logSecurityEvent } from '@/lib/security/audit-logger'
import { generateToken } from '@/lib/security/auth-middleware'
import { securityConfig } from '@/lib/security/config'
import { verifyPassword } from '@/lib/security/password'
import { withRateLimit } from '@/lib/security/rate-limit'
import { loginRequestSchema } from '@/lib/validation/api-schemas'
import { type NextRequest, NextResponse } from 'next/server'

// Mock user database with hashed passwords
// In production, these would come from a secure database
// Passwords: admin123, dev123, view123 (hashed with bcrypt)
const MOCK_USERS = {
  admin: {
    // Password: admin123
    passwordHash: '$2b$12$h1WtjtTMvMCL8MKSVki3Fu96Wquc9xqmK6qR9yhdCjbK6IY6lNGXi',
    permissions: ['admin', 'read', 'write'],
    projectIds: [], // Admin has access to all projects
  },
  developer: {
    // Password: dev123
    passwordHash: '$2b$12$I5k65BcASozE56/0Qb1.7O8irTbEAhJk.0359.YS4JCaVAwyZGi0G',
    permissions: ['read', 'write'],
    projectIds: ['devkit', 'scopecam'],
  },
  viewer: {
    // Password: view123
    passwordHash: '$2b$12$NYeuBAkbWyN43IRSRNCQT.D7x/CH5vyBMsIw3ZoTh.PuZNV9pmgGe',
    permissions: ['read'],
    projectIds: ['devkit'],
  },
}

async function loginHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const result = loginRequestSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.format() },
        { status: 400 }
      )
    }

    const { username, password } = result.data
    const user = MOCK_USERS[username as keyof typeof MOCK_USERS]

    // Check if user exists
    if (!user) {
      logSecurityEvent(
        'auth.login.failed',
        {
          username,
          reason: 'User not found',
          ...getRequestMetadata(request),
        },
        'warn'
      )
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash)
    if (!isPasswordValid) {
      logSecurityEvent(
        'auth.login.failed',
        {
          username,
          reason: 'Invalid password',
          ...getRequestMetadata(request),
        },
        'warn'
      )
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Generate JWT token
    const token = await generateToken({
      userId: username,
      permissions: user.permissions,
      projectIds: user.projectIds,
    })

    logSecurityEvent('auth.login.success', {
      userId: username,
      username,
      ...getRequestMetadata(request),
    })

    // Create response with token
    const response = NextResponse.json({
      token,
      user: {
        id: username,
        permissions: user.permissions,
        projectIds: user.projectIds,
      },
    })

    // Also set as httpOnly cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    logger.error('Login error', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Export with rate limiting - strict limit for auth endpoints
export const POST = withRateLimit(loginHandler, securityConfig.rateLimit.api.auth)
