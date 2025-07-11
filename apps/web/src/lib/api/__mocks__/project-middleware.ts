import { type NextRequest, NextResponse } from 'next/server'

export interface ProjectContext {
  projectId: string
  projectPath?: string
}

export function validateProjectId(params: { projectId?: string }): string {
  if (!params.projectId) {
    throw new Error('Project ID is required')
  }

  // For tests, just validate the format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const slugRegex = /^[a-z0-9-]{3,64}$/i

  if (!uuidRegex.test(params.projectId) && !slugRegex.test(params.projectId)) {
    throw new Error(
      'Project ID must be a valid UUID or slug (3-64 characters, alphanumeric and hyphens only)'
    )
  }

  return params.projectId
}

export async function validateProjectAccess(
  _request: NextRequest,
  _projectId: string
): Promise<boolean> {
  // Always allow access in tests
  return true
}

export function withProjectValidation<T extends Record<string, unknown>>(
  handler: (
    request: NextRequest,
    context: { params: T & { projectId: string } }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params: T }): Promise<NextResponse> => {
    try {
      const projectId = validateProjectId(context.params)

      // For tests, always allow access
      return handler(request, {
        ...context,
        params: { ...context.params, projectId },
      })
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Validation error' },
        { status: 400 }
      )
    }
  }
}

export function getProjectContext(params: { projectId?: string }): ProjectContext {
  const projectId = validateProjectId(params)
  return { projectId }
}
