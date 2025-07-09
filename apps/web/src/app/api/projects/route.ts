import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger-server'
import { env } from '@/lib/env'
import { getMockProjectsResponse } from '@/mocks/projects'
import { withRateLimit } from '@/lib/security/rate-limit'
import { securityConfig } from '@/lib/security/config'
import { withAuth, AuthContext } from '@/lib/security/auth-middleware'

// Mark as dynamic to prevent static generation
export const dynamic = 'force-dynamic'

async function getProjectsHandler(request: NextRequest, authContext: AuthContext) {
  try {
    logger.info('Fetching projects list')

    if (env.USE_REAL_DATA) {
      try {
        const response = await fetch(`${env.NEXT_PUBLIC_BRIDGE_SERVER_URL}/api/projects`, {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Bridge server error: ${response.statusText}`)
        }

        const data = await response.json()
        logger.info(`Fetched ${data.projects?.length || 0} projects from bridge server`)
        return NextResponse.json(data)
      } catch (error) {
        logger.error('Failed to fetch projects from bridge', error as Error)
        // Fall back to mock data
      }
    }

    // Return mock data for development
    return NextResponse.json(getMockProjectsResponse())
  } catch (error) {
    logger.error('Projects list error', error as Error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
      },
      { status: 500 }
    )
  }
}

// Export with authentication and rate limiting
const authenticatedHandler = withAuth(getProjectsHandler)
export const GET = withRateLimit(authenticatedHandler, securityConfig.rateLimit.api.projects)
