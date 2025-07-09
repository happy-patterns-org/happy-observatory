import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger-server'
import { withAuth, AuthContext } from '@/lib/security/auth-middleware'
import { withRateLimit } from '@/lib/security/rate-limit'

async function postAgentCommandHandler(request: NextRequest, authContext: AuthContext) {
  try {
    const { agentId, command, parameters, source } = await request.json()

    // Validate required fields
    if (!agentId || !command) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId and command' },
        { status: 400 }
      )
    }

    // Log the command
    logger.info('Agent command received', {
      agentId,
      command,
      source,
      parameters,
    })

    // In production, this would execute the actual CLI command
    // For example: exec(`sct agent ${agentId} ${command}`)

    // Simulate command execution
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Simulate occasional failures for testing
    if (Math.random() < 0.1) {
      return NextResponse.json(
        { error: 'Command execution failed: Agent not responding' },
        { status: 500 }
      )
    }

    // Return success response
    return NextResponse.json({
      success: true,
      agentId,
      command,
      executedAt: new Date().toISOString(),
      // In production, this would include actual command output
      output: `Successfully executed ${command} on agent ${agentId}`,
    })
  } catch (error) {
    logger.error('Error executing agent command', error as Error)
    return NextResponse.json({ error: 'Failed to execute command' }, { status: 500 })
  }
}

// Export with authentication and rate limiting - requires write permission
const authenticatedHandler = withAuth(postAgentCommandHandler, { permissions: ['write'] })
export const POST = withRateLimit(authenticatedHandler)
