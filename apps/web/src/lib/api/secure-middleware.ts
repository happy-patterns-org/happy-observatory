import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/security/auth-middleware'
import { withRateLimit, RateLimitOptions } from '@/lib/security/rate-limit'
import { withProjectValidation, ProjectContext } from './project-middleware'

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

export function withSecureMiddleware<T extends any>(
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
            projectSlug: projectId,
          }
        }

        return handler(req, context, routeContext)
      },
      { mode: auth.mode, permissions: auth.permissions }
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
    wrappedHandler = withProjectValidation(wrappedHandler) as any
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
      rateLimit: rateLimitOptions,
    }),

  // Authenticated read-only endpoints
  readOnly: (handler: any, rateLimitOptions?: RateLimitOptions) =>
    withSecureMiddleware(handler, {
      auth: { permissions: ['read'] },
      rateLimit: rateLimitOptions,
    }),

  // Authenticated write endpoints
  write: (handler: any, rateLimitOptions?: RateLimitOptions) =>
    withSecureMiddleware(handler, {
      auth: { permissions: ['write'] },
      rateLimit: rateLimitOptions,
    }),

  // Admin-only endpoints
  admin: (handler: any, rateLimitOptions?: RateLimitOptions) =>
    withSecureMiddleware(handler, {
      auth: { permissions: ['admin'] },
      rateLimit: rateLimitOptions,
    }),

  // Project-scoped read endpoints
  projectRead: (handler: any, rateLimitOptions?: RateLimitOptions) =>
    withSecureMiddleware(handler, {
      auth: { permissions: ['read'] },
      rateLimit: rateLimitOptions,
      projectValidation: true,
    }),

  // Project-scoped write endpoints
  projectWrite: (handler: any, rateLimitOptions?: RateLimitOptions) =>
    withSecureMiddleware(handler, {
      auth: { permissions: ['write'] },
      rateLimit: rateLimitOptions,
      projectValidation: true,
    }),
}
