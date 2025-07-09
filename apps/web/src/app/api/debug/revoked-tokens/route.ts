import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'

export async function GET(request: NextRequest) {
  if (env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  // Simple debug token check
  const debugToken = request.headers.get('x-debug-token')
  if (debugToken !== 'development-only') {
    return NextResponse.json({ error: 'Invalid debug token' }, { status: 401 })
  }

  try {
    // Import dynamically to access internal state
    const { getRevocationStats } = await import('@/lib/security/token-revocation')
    const stats = getRevocationStats()

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get revocation stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
