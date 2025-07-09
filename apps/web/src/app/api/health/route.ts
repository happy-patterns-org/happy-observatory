import { NextRequest, NextResponse } from 'next/server'
import { runDiagnostics } from '@/lib/diagnostics'
import { withRateLimit } from '@/lib/security/rate-limit'

async function healthHandler(request: NextRequest) {
  try {
    const port = Number(process.env.PORT) || 3000
    const diagnosticsReport = await runDiagnostics(port)

    return NextResponse.json(
      {
        status: diagnosticsReport.isHealthy ? 'healthy' : 'unhealthy',
        timestamp: diagnosticsReport.timestamp.toISOString(),
        checks: diagnosticsReport.diagnostics.map((d) => ({
          passed: d.status === 'pass',
          message: d.message,
          details: {
            ...d.details,
            checkName: d.check,
            environment: 'server',
          },
        })),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          env: process.env.NODE_ENV,
        },
      },
      {
        status: diagnosticsReport.isHealthy ? 200 : 503,
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
      }
    )
  }
}

// Export with rate limiting
export const GET = withRateLimit(healthHandler)
