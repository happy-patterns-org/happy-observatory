import { type AuthContext, withAuth } from '@/lib/security/auth-middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { type ProjectContext } from './project-middleware'

/**
 * Combine authentication and project validation middleware
 */
export function withAuthAndProject<T extends { params: { projectId: string } }>(
  handler: (
    req: NextRequest,
    authContext: AuthContext,
    projectContext: ProjectContext,
    routeContext: T
  ) => Promise<NextResponse>,
  authOptions?: { permissions?: string[] }
) {
  // First validate project, then authenticate
  return async (request: NextRequest, context: T): Promise<NextResponse> => {
    // Validate project ID format
    try {
      const projectIdSchema =
        /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z0-9-]{3,64})$/i
      if (!projectIdSchema.test(context.params.projectId)) {
        return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 })
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid project' }, { status: 400 })
    }

    // Then authenticate
    const authHandler = withAuth(
      async (req: NextRequest, authContext: AuthContext, routeContext: T) => {
        // Extract project context
        const projectContext: ProjectContext = {
          projectId: routeContext.params.projectId,
        }

        // Check project access
        if (!authContext.hasProjectAccess(projectContext.projectId)) {
          return NextResponse.json({ error: 'Access denied to project' }, { status: 403 })
        }

        // Call the actual handler
        return handler(req, authContext, projectContext, routeContext)
      },
      authOptions
    )

    return authHandler(request, context)
  }
}
