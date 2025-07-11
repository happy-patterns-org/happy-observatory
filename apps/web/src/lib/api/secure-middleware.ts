import { type AuthContext, withAuth } from '@/lib/security/auth-middleware'
import { type RateLimitOptions, withRateLimit } from '@/lib/security/rate-limit'
import { type NextRequest, NextResponse } from 'next/server'
import { type ProjectContext, withProjectValidation } from './project-middleware'

/**
 * Options for secure middleware composition
 */
export interface SecureMiddlewareOptions {
  auth?: {
    mode?: 'required' | 'optional' | 'none'
    permissions?: string[]
  }
  rateLimit?: RateLimitOptions | false
  projectValidation?: boolean
}

/**
 * Compose multiple middleware for secure API routes
 */
export interface SecureContext {
  auth?: AuthContext
  project?: ProjectContext
}

export function withSecureMiddleware<T>(
  handler: (req: NextRequest, context: SecureContext, routeContext: T) => Promise<NextResponse>,
  options: SecureMiddlewareOptions = {}
) {
  const { auth = { mode: 'required' }, rateLimit = {}, projectValidation = false } = options

  // Build middleware chain
  let wrappedHandler = handler

  // Apply authentication if not disabled
  if (auth.mode !== 'none') {
    const authHandler = withAuth(
      async (req: NextRequest, authContext: AuthContext, routeContext: T) => {
        const context: SecureContext = { auth: authContext }

        // If project validation is needed and we have projectId
        if (projectValidation && (routeContext as any).params?.projectId) {
          const projectId = (routeContext as any).params.projectId

          // Check project access
          if (!authContext.hasProjectAccess(projectId)) {
            return NextResponse.json({ error: 'Access denied to project' }, { status: 403 })
          }

          context.project = {
            projectId,
          }
        }

        return handler(req, context, routeContext)
      },
      {
        ...(auth.mode && { mode: auth.mode }),
        ...(auth.permissions && { permissions: auth.permissions }),
      }
    )

    wrappedHandler = authHandler as any
  }

  // Apply rate limiting if not disabled
  if (rateLimit !== false) {
    wrappedHandler = withRateLimit(wrappedHandler, rateLimit) as any
  }

  // Apply project validation if needed
  if (projectValidation && auth.mode === 'none') {
    // Only apply project validation without auth
    const adaptedHandler = (req: NextRequest, context: { params: any }) => {
      return wrappedHandler(req, {}, context as T)
    }
    wrappedHandler = withProjectValidation(adaptedHandler) as any
  }

  return wrappedHandler
}

/**
 * Pre-configured secure middleware for common use cases
 */
export const secureEndpoints = {
  // Public endpoints with rate limiting only
  public: (handler: any, rateLimitOptions?: RateLimitOptions) =>
    withSecureMiddleware(handler, {
      auth: { mode: 'none' },
      ...(rateLimitOptions && { rateLimit: rateLimitOptions }),
    }),

  // Authenticated read-only endpoints
  readOnly: (handler: any, rateLimitOptions?: RateLimitOptions) =>
    withSecureMiddleware(handler, {
      auth: { permissions: ['read'] },
      ...(rateLimitOptions && { rateLimit: rateLimitOptions }),
    }),

  // Authenticated write endpoints
  write: (handler: any, rateLimitOptions?: RateLimitOptions) =>
    withSecureMiddleware(handler, {
      auth: { permissions: ['write'] },
      ...(rateLimitOptions && { rateLimit: rateLimitOptions }),
    }),

  // Admin-only endpoints
  admin: (handler: any, rateLimitOptions?: RateLimitOptions) =>
    withSecureMiddleware(handler, {
      auth: { permissions: ['admin'] },
      ...(rateLimitOptions && { rateLimit: rateLimitOptions }),
    }),

  // Project-scoped read endpoints
  projectRead: (handler: any, rateLimitOptions?: RateLimitOptions) =>
    withSecureMiddleware(handler, {
      auth: { permissions: ['read'] },
      ...(rateLimitOptions && { rateLimit: rateLimitOptions }),
      projectValidation: true,
    }),

  // Project-scoped write endpoints
  projectWrite: (handler: any, rateLimitOptions?: RateLimitOptions) =>
    withSecureMiddleware(handler, {
      auth: { permissions: ['write'] },
      ...(rateLimitOptions && { rateLimit: rateLimitOptions }),
      projectValidation: true,
    }),
}
