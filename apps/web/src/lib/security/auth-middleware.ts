import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger-server'
import { securityConfig } from './config'
import * as jose from 'jose'
import { checkTokenRevocation } from './token-revocation'
import { nanoid } from 'nanoid'

// Auth token schema
const authTokenSchema = z.object({
  userId: z.string(),
  projectIds: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  exp: z.number(),
  jti: z.string().optional(), // JWT ID for revocation
})

export type AuthToken = z.infer<typeof authTokenSchema>

// Auth context that will be passed to handlers
export interface AuthContext {
  user: AuthToken
  hasPermission: (permission: string) => boolean
  hasProjectAccess: (projectId: string) => boolean
}

/**
 * Extract and verify JWT token from request
 */
async function verifyToken(token: string): Promise<AuthToken | null> {
  try {
    const secret = new TextEncoder().encode(securityConfig.jwt.secret)
    const { payload } = await jose.jwtVerify(token, secret)

    const result = authTokenSchema.safeParse(payload)
    if (!result.success) {
      logger.warn('Invalid token payload', { error: result.error })
      return null
    }

    // Check if token has been revoked
    if (result.data.jti) {
      const isValid = await checkTokenRevocation(result.data.jti)
      if (!isValid) {
        logger.warn('Token has been revoked', { jti: result.data.jti })
        return null
      }
    }

    return result.data
  } catch (error) {
    logger.warn('Token verification failed', error as Error)
    return null
  }
}

/**
 * Extract token from Authorization header or cookie
 */
function extractToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check cookie
  const cookieToken = request.cookies.get('auth-token')?.value
  if (cookieToken) {
    return cookieToken
  }

  return null
}

/**
 * Authentication modes
 */
export type AuthMode = 'required' | 'optional' | 'none'

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(mode: AuthMode = 'required') {
  return async function authMiddleware(
    request: NextRequest,
    handler: (req: NextRequest, context?: AuthContext) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Skip auth for 'none' mode
    if (mode === 'none') {
      return handler(request)
    }

    const token = extractToken(request)

    // No token found
    if (!token) {
      if (mode === 'optional') {
        return handler(request)
      }
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify token
    const authToken = await verifyToken(token)
    if (!authToken) {
      if (mode === 'optional') {
        return handler(request)
      }
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    // Create auth context
    const context: AuthContext = {
      user: authToken,
      hasPermission: (permission: string) => {
        return authToken.permissions?.includes(permission) || false
      },
      hasProjectAccess: (projectId: string) => {
        // Admin users have access to all projects
        if (authToken.permissions?.includes('admin')) {
          return true
        }
        // Check if user has access to specific project
        return authToken.projectIds?.includes(projectId) || false
      },
    }

    // Call handler with auth context
    return handler(request, context)
  }
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function withAuth<T extends any[], R>(
  handler: (req: NextRequest, context: AuthContext, ...args: T) => Promise<R>,
  options: { mode?: AuthMode; permissions?: string[] } = {}
) {
  const { mode = 'required', permissions = [] } = options

  return async function authenticatedHandler(req: NextRequest, ...args: T): Promise<NextResponse> {
    const middleware = createAuthMiddleware(mode)

    return middleware(req, async (request, context) => {
      // Check required permissions
      if (permissions.length > 0 && context) {
        const hasAllPermissions = permissions.every((p) => context.hasPermission(p))
        if (!hasAllPermissions) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }
      }

      // Call the actual handler
      try {
        const result = await handler(request, context!, ...args)
        return result as NextResponse
      } catch (error) {
        logger.error('Handler error', error as Error)
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Internal server error' },
          { status: 500 }
        )
      }
    })
  }
}

/**
 * Generate a JWT token
 */
export async function generateToken(payload: Omit<AuthToken, 'exp' | 'jti'>): Promise<string> {
  const secret = new TextEncoder().encode(securityConfig.jwt.secret)

  // Parse duration string (e.g., '24h', '7d', '30m')
  const expiresIn = securityConfig.jwt.expiresIn
  const duration = parseDuration(expiresIn)
  const exp = Math.floor(Date.now() / 1000) + duration

  const token = await new jose.SignJWT({
    ...payload,
    exp,
    jti: nanoid(), // Generate unique JWT ID for revocation tracking
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(secret)

  return token
}

/**
 * Parse duration string to seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([hdms])$/)
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`)
  }

  const [, value, unit] = match
  const num = parseInt(value, 10)

  switch (unit) {
    case 's':
      return num
    case 'm':
      return num * 60
    case 'h':
      return num * 60 * 60
    case 'd':
      return num * 60 * 60 * 24
    default:
      throw new Error(`Invalid duration unit: ${unit}`)
  }
}
