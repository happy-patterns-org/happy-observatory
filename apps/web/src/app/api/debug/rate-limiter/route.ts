import { env } from '@/lib/env'
import { type NextRequest, NextResponse } from 'next/server'

// Only available in development
export async function GET(request: NextRequest) {
  if (env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  // Simple debug token check
  const debugToken = request.headers.get('x-debug-token')
  if (debugToken !== 'development-only') {
    return NextResponse.json({ error: 'Invalid debug token' }, { status: 401 })
  }

  // Get rate limiter stats
  // This requires exporting the rateLimitStore from rate-limit.ts
  try {
    // Import dynamically to access internal state
    const { getRateLimiterStats } = await import('@/lib/security/rate-limit')
    const stats = getRateLimiterStats()

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get rate limiter stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
