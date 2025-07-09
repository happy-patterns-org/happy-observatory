import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger-server'

// Schema for project ID validation - accepts UUID or slug format
const projectIdSchema = z.string().refine(
  (val) => {
    // Check if it's a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(val)) return true

    // Check if it's a valid slug (3-64 chars, alphanumeric + hyphens)
    const slugRegex = /^[a-z0-9-]{3,64}$/i
    return slugRegex.test(val)
  },
  {
    message:
      'Project ID must be a valid UUID or slug (3-64 characters, alphanumeric and hyphens only)',
  }
)

export interface ProjectContext {
  projectId: string
  projectPath?: string
}

/**
 * Validates project ID from request params
 */
export function validateProjectId(params: { projectId?: string }): string {
  if (!params.projectId) {
    throw new Error('Project ID is required')
  }

  try {
    return projectIdSchema.parse(params.projectId)
  } catch (error) {
    throw new Error('Invalid project ID format')
  }
}

/**
 * Middleware to validate project access
 * In a real app, this would check user permissions
 */
export async function validateProjectAccess(
  request: NextRequest,
  projectId: string
): Promise<boolean> {
  try {
    // In a real implementation, this would:
    // 1. Query database to check if project exists
    // 2. Verify user has access to the project (from auth token)
    // 3. Check any project-specific permissions

    // For now, check against known project IDs
    const validProjectIds = ['devkit', 'scopecam', 'happy-observatory', 'sunshine-nexus']

    // Also accept UUIDs (basic validation)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)

    if (validProjectIds.includes(projectId) || isUuid) {
      logger.info('Project access granted', {
        projectId,
        method: request.method,
        path: request.nextUrl.pathname,
      })
      return true
    }

    logger.warn('Project access denied - unknown project', { projectId })
    return false
  } catch (error) {
    logger.error('Error validating project access', error as Error)
    return false
  }
}

/**
 * Higher-order function to wrap API routes with project validation
 */
export function withProjectValidation<T extends Record<string, unknown>>(
  handler: (
    request: NextRequest,
    context: { params: T & { projectId: string } }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params: T }): Promise<NextResponse> => {
    try {
      // Validate project ID format
      const projectId = validateProjectId(context.params)

      // Check project access permissions
      const hasAccess = await validateProjectAccess(request, projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to project' }, { status: 403 })
      }

      // Call the actual handler with validated projectId
      return handler(request, {
        params: { ...context.params, projectId },
      })
    } catch (error) {
      logger.error('Project validation failed', error as Error)
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Invalid project',
        },
        { status: 400 }
      )
    }
  }
}

/**
 * Extract project context from request
 */
export function getProjectContext(params: { projectId: string }): ProjectContext {
  // In a real implementation, you might fetch additional project data
  // from a database or cache
  return {
    projectId: params.projectId,
    // projectPath would be fetched from storage
  }
}
