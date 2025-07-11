import { env } from '@/lib/env'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to verify IP detection with TRUST_PROXY_HEADERS
 */
export async function GET(request: NextRequest) {
  const trustProxy = env.TRUST_PROXY_HEADERS === 'true'

  // Get all possible IP sources
  const ipSources = {
    'x-forwarded-for': request.headers.get('x-forwarded-for'),
    'x-real-ip': request.headers.get('x-real-ip'),
    'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
    'x-client-ip': request.headers.get('x-client-ip'),
    'connection-remote-address': null, // NextRequest doesn't have an 'ip' property
  }

  // Determine detected IP based on trust settings
  let detectedIp = 'unknown'

  if (trustProxy) {
    // Trust proxy headers
    const xForwardedFor = ipSources['x-forwarded-for']
    detectedIp =
      (xForwardedFor ? xForwardedFor.split(',')[0]?.trim() ?? null : null) ||
      ipSources['x-real-ip'] ||
      ipSources['cf-connecting-ip'] ||
      ipSources['connection-remote-address'] ||
      'unknown'
  } else {
    // Only use direct connection
    detectedIp = ipSources['connection-remote-address'] || 'unknown'
  }

  return NextResponse.json({
    detectedIp,
    trustProxy,
    ipSources,
    timestamp: new Date().toISOString(),
  })
}
