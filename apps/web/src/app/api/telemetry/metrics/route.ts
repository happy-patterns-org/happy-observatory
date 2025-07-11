import config, { API_PATHS, getBridgeAPIUrl } from '@/config-adapter'
import { type AuthContext, withAuth } from '@/lib/security/auth-middleware'
import { securityConfig } from '@/lib/security/config'
import { withRateLimit } from '@/lib/security/rate-limit'
import { type NextRequest, NextResponse } from 'next/server'

async function getTelemetryHandler(request: NextRequest, _authContext: AuthContext) {
  try {
    const useRealData = config.useRealData

    // Get time range from query params
    const searchParams = request.nextUrl.searchParams
    const minutes = searchParams.get('minutes') || '60'

    if (useRealData) {
      try {
        // Fetch real telemetry from bridge server
        const response = await fetch(getBridgeAPIUrl(`${API_PATHS.metrics}?minutes=${minutes}`))

        if (response.ok) {
          const data = await response.json()
          return NextResponse.json({
            ...data,
            isRealData: true,
            source: 'bridge',
          })
        }
      } catch (error) {
        console.error('Failed to fetch from bridge server:', error)
        // Fall through to mock data
      }
    }

    // Mock telemetry data
    const now = Date.now()
    const mockMetrics = {
      system: {
        cpu: Math.floor(Math.random() * 30 + 20),
        memory: Math.floor(Math.random() * 20 + 60),
        disk: Math.floor(Math.random() * 40 + 40),
        uptime: 86400, // 24 hours in seconds
      },
      agents: {
        active: Math.floor(Math.random() * 5 + 1),
        total: 8,
        tasks_completed: Math.floor(Math.random() * 100 + 50),
        tasks_failed: Math.floor(Math.random() * 10),
        success_rate: 0.95 + Math.random() * 0.04,
      },
      performance: {
        avg_response_time: Math.random() * 2 + 0.5,
        throughput: Math.floor(Math.random() * 50 + 20),
        queue_length: Math.floor(Math.random() * 10),
      },
      timeline: Array.from({ length: 12 }, (_, i) => ({
        timestamp: new Date(now - (11 - i) * 5 * 60 * 1000).toISOString(),
        cpu: Math.floor(Math.random() * 30 + 20),
        memory: Math.floor(Math.random() * 20 + 60),
        active_agents: Math.floor(Math.random() * 5 + 1),
        tasks_per_minute: Math.floor(Math.random() * 10 + 5),
      })),
    }

    return NextResponse.json({
      metrics: mockMetrics,
      isRealData: false,
      source: 'mock',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching telemetry metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch telemetry metrics' }, { status: 500 })
  }
}

// Export with authentication and rate limiting
const authenticatedHandler = withAuth(getTelemetryHandler)
export const GET = withRateLimit(authenticatedHandler, securityConfig.rateLimit.api.telemetry)
