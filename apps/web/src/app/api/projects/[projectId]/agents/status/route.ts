import { withAuthAndProject } from '@/lib/api/auth-project-middleware'
import { type ProjectContext, getProjectContext } from '@/lib/api/project-middleware'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger-server'
import type { AuthContext } from '@/lib/security/auth-middleware'
import { type NextRequest, NextResponse } from 'next/server'

async function handler(
  request: NextRequest,
  _authContext: AuthContext,
  _projectContext: ProjectContext,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectContext = getProjectContext(params)
    const { searchParams } = request.nextUrl
    const agentId = searchParams.get('agentId')

    if (env.USE_REAL_DATA) {
      try {
        const url = new URL(
          `${env.NEXT_PUBLIC_BRIDGE_SERVER_URL}/api/projects/${projectContext.projectId}/agents/status`
        )
        if (agentId) {
          url.searchParams.set('agentId', agentId)
        }

        const response = await fetch(url.toString(), {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Bridge server error: ${response.statusText}`)
        }

        return NextResponse.json(await response.json())
      } catch (error) {
        logger.error('Failed to fetch from bridge server', error as Error, {
          projectId: projectContext.projectId,
        })
        // Fall back to mock data
      }
    }

    // Mock data for development
    const mockAgents = [
      {
        id: agentId || 'orchestrator-001',
        name: 'Test Orchestrator',
        projectId: projectContext.projectId,
        status: 'active',
        type: 'orchestrator',
        lastActivity: new Date(Date.now() - 30000).toISOString(),
        metrics: {
          tasksCompleted: 42,
          tasksInProgress: 3,
          successRate: 0.95,
        },
      },
      {
        id: 'analyzer-001',
        name: 'Code Analyzer',
        projectId: projectContext.projectId,
        status: 'idle',
        type: 'analyzer',
        lastActivity: new Date(Date.now() - 120000).toISOString(),
        metrics: {
          filesAnalyzed: 156,
          issuesFound: 23,
          avgAnalysisTime: 1.2,
        },
      },
    ]

    if (agentId) {
      const agent = mockAgents.find((a) => a.id === agentId)
      return NextResponse.json(agent || { error: 'Agent not found' })
    }

    return NextResponse.json({
      agents: mockAgents,
      projectId: projectContext.projectId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Agent status error', error as Error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get status',
        projectId: params.projectId,
      },
      { status: 500 }
    )
  }
}

export const GET = withAuthAndProject(handler)
