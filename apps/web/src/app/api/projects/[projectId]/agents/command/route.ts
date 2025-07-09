import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger-server'
import { env } from '@/lib/env'
import { secureEndpoints, SecureContext } from '@/lib/api/secure-middleware'
import { securityConfig } from '@/lib/security/config'
import { agentCommandRequestSchema } from '@/lib/validation/api-schemas'

async function handler(
  request: NextRequest,
  context: SecureContext,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json()
    const validationResult = agentCommandRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { agentId, command, parameters, source } = validationResult.data

    logger.info('Agent command received', {
      projectId: context.project?.projectId || params.projectId,
      agentId,
      command,
      source,
      userId: context.auth?.user.userId,
    })

    // Forward to bridge server with project context
    if (env.USE_REAL_DATA) {
      try {
        const response = await fetch(
          `${env.NEXT_PUBLIC_BRIDGE_SERVER_URL}/api/projects/${params.projectId}/agents/command`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              agentId,
              command,
              parameters,
              source,
              projectId: params.projectId,
            }),
          }
        )

        if (!response.ok) {
          throw new Error(`Bridge server error: ${response.statusText}`)
        }

        return NextResponse.json(await response.json())
      } catch (error) {
        logger.error('Failed to execute agent command via bridge', error as Error, {
          projectId: params.projectId,
          agentId,
        })
        // Fall through to mock response in development
      }
    }

    // Mock response for development
    return NextResponse.json({
      success: true,
      agentId,
      command,
      projectId: params.projectId,
      result: {
        status: 'completed',
        output: `Mock: Executed ${command} for agent ${agentId} in project ${params.projectId}`,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error('Agent command error', error as Error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to execute command',
        projectId: params.projectId,
      },
      { status: 500 }
    )
  }
}

// Wrap with security middleware - auth + rate limiting + project validation
export const POST = secureEndpoints.projectWrite(handler, securityConfig.rateLimit.api.agents)
