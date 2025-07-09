import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger-server'
import { env } from '@/lib/env'
import { withProjectValidation, getProjectContext } from '@/lib/api/project-middleware'

// Mark as dynamic to prevent static generation issues
export const dynamic = 'force-dynamic'

async function handler(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const projectContext = getProjectContext(params)
    const { searchParams } = request.nextUrl
    const timeRange = searchParams.get('timeRange') || '1h'
    const metricType = searchParams.get('type') || 'all'

    logger.info('Fetching telemetry metrics', {
      projectId: projectContext.projectId,
      timeRange,
      metricType,
    })

    if (env.USE_REAL_DATA) {
      try {
        const url = new URL(
          `${env.NEXT_PUBLIC_BRIDGE_SERVER_URL}/api/projects/${projectContext.projectId}/telemetry/metrics`
        )
        url.searchParams.set('timeRange', timeRange)
        url.searchParams.set('type', metricType)

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
        logger.error('Failed to fetch telemetry from bridge', error as Error, {
          projectId: projectContext.projectId,
        })
        // Fall back to mock data
      }
    }

    // Mock telemetry data for development
    const now = Date.now()
    const mockMetrics = {
      projectId: projectContext.projectId,
      timeRange,
      metrics: {
        testRuns: {
          total: 245,
          passed: 230,
          failed: 15,
          duration: {
            avg: 45.2,
            min: 12.1,
            max: 123.4,
          },
          trend: Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(now - (24 - i) * 3600000).toISOString(),
            value: Math.floor(Math.random() * 20) + 5,
          })),
        },
        performance: {
          cpu: {
            current: 42.3,
            avg: 38.5,
            trend: Array.from({ length: 60 }, (_, i) => ({
              timestamp: new Date(now - (60 - i) * 60000).toISOString(),
              value: Math.random() * 100,
            })),
          },
          memory: {
            current: 1234,
            avg: 1100,
            max: 2048,
            trend: Array.from({ length: 60 }, (_, i) => ({
              timestamp: new Date(now - (60 - i) * 60000).toISOString(),
              value: Math.floor(Math.random() * 500) + 800,
            })),
          },
        },
        agents: {
          active: 3,
          idle: 2,
          total: 5,
          taskQueue: 12,
          completionRate: 0.92,
        },
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(mockMetrics)
  } catch (error) {
    logger.error('Telemetry metrics error', error as Error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch metrics',
        projectId: params.projectId,
      },
      { status: 500 }
    )
  }
}

export const GET = withProjectValidation(handler)
