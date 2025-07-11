import { API_PATHS, getBridgeAPIUrl } from '@/config-adapter'
import { getProjectContext, withProjectValidation } from '@/lib/api/project-middleware'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger-server'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const executeSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
})

async function handler(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectContext = getProjectContext(params)
    const body = await request.json()
    const { command, cwd, env: envVars } = executeSchema.parse(body)

    logger.info('Console command execution requested', {
      projectId: projectContext.projectId,
      command,
      cwd,
    })

    if (env.USE_REAL_DATA) {
      try {
        const response = await fetch(
          getBridgeAPIUrl(API_PATHS.consoleExecute(projectContext.projectId)),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              command,
              cwd,
              env: envVars,
              projectId: projectContext.projectId,
            }),
          }
        )

        if (!response.ok) {
          throw new Error(`Bridge server error: ${response.statusText}`)
        }

        return NextResponse.json(await response.json())
      } catch (error) {
        logger.error('Failed to execute command via bridge', error as Error, {
          projectId: projectContext.projectId,
          command,
        })
        throw error
      }
    }

    // Mock response for development
    const mockOutput = `Mock output for: ${command}\nProject: ${projectContext.projectId}\nWorking directory: ${cwd || 'default'}\n`

    return NextResponse.json({
      success: true,
      projectId: projectContext.projectId,
      output: mockOutput,
      exitCode: 0,
      duration: Math.random() * 1000 + 100,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Console execution error', error as Error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Command execution failed',
        projectId: params.projectId,
      },
      { status: 500 }
    )
  }
}

export const POST = withProjectValidation(handler)
