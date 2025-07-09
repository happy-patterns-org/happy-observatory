import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger-server'
import { securityConfig } from './config'
import { env } from '@/lib/env'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Use Map for better performance and memory management
const rateLimitStore = new Map<string, RateLimitEntry>()
const MAX_STORE_SIZE = 10000 // Maximum number of entries to prevent unbounded growth

// Track cleanup interval
let cleanupInterval: NodeJS.Timeout | null = null

// Start cleanup interval if not already running
function startCleanupInterval() {
  if (cleanupInterval) return

  // Clean up expired entries periodically
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    const keysToDelete: string[] = []

    // Collect expired keys
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        keysToDelete.push(key)
      }
    }

    // Delete expired entries
    for (const key of keysToDelete) {
      rateLimitStore.delete(key)
    }

    // Log cleanup stats in development
    if (process.env.NODE_ENV === 'development' && keysToDelete.length > 0) {
      logger.debug(`Rate limiter cleanup: removed ${keysToDelete.length} expired entries`)
    }
  }, 60 * 1000) // Clean up every minute

  // Ensure cleanup stops when process exits
  process.on('beforeExit', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
    }
  })
}

// Start cleanup when module loads
startCleanupInterval()

export interface RateLimitOptions {
  windowMs?: number
  max?: number
  keyGenerator?: (req: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

/**
 * Create a rate limiter middleware
 */
/**
 * Get client IP address from request
 */
function getClientIp(req: NextRequest): string {
  const trustProxy = env.TRUST_PROXY_HEADERS === 'true'

  if (trustProxy) {
    // Check X-Forwarded-For header (for proxies/load balancers)
    const forwardedFor = req.headers.get('x-forwarded-for')
    if (forwardedFor) {
      // Take the first IP if there are multiple
      return forwardedFor.split(',')[0].trim()
    }

    // Check X-Real-IP header
    const realIp = req.headers.get('x-real-ip')
    if (realIp) {
      return realIp
    }

    // Check Cloudflare header
    const cfIp = req.headers.get('cf-connecting-ip')
    if (cfIp) {
      return cfIp
    }
  }

  // Fall back to req.ip (may be undefined in some environments)
  // If not trusting proxy headers, this is the only source
  return (req as any).ip || 'unknown'
}

export function createRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = securityConfig.rateLimit.global.windowMs,
    max = securityConfig.rateLimit.global.max,
    keyGenerator = getClientIp,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options

  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(request)
    const now = Date.now()

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key)
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      }

      // Check store size before adding new entry
      if (rateLimitStore.size >= MAX_STORE_SIZE) {
        // Remove oldest entries
        const entriesToRemove = Math.floor(MAX_STORE_SIZE * 0.1) // Remove 10%
        const sortedEntries = Array.from(rateLimitStore.entries()).sort(
          ([, a], [, b]) => a.resetTime - b.resetTime
        )

        for (let i = 0; i < entriesToRemove; i++) {
          rateLimitStore.delete(sortedEntries[i][0])
        }

        logger.warn(`Rate limiter store size exceeded, removed ${entriesToRemove} oldest entries`)
      }

      rateLimitStore.set(key, entry)
    }

    // Check if limit exceeded
    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

      logger.warn('Rate limit exceeded', {
        key,
        count: entry.count,
        max,
        retryAfter,
      })

      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
            'Access-Control-Expose-Headers':
              'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After',
          },
        }
      )
    }

    // Increment counter before processing
    entry.count++

    try {
      // Process request
      const response = await handler(request)

      // Skip counting successful requests if configured
      if (skipSuccessfulRequests && response.status < 400) {
        entry.count--
      }

      // Add rate limit headers to response
      const remaining = Math.max(0, max - entry.count)
      response.headers.set('X-RateLimit-Limit', max.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString())

      // Expose rate limit headers for CORS
      const exposeHeaders = response.headers.get('Access-Control-Expose-Headers') || ''
      const rateLimitHeaders = 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset'
      response.headers.set(
        'Access-Control-Expose-Headers',
        exposeHeaders ? `${exposeHeaders}, ${rateLimitHeaders}` : rateLimitHeaders
      )

      return response
    } catch (error) {
      // Skip counting failed requests if configured
      if (skipFailedRequests) {
        entry.count--
      }
      throw error
    }
  }
}

/**
 * Get rate limiter for specific API endpoint type
 */
export function getApiRateLimiter(apiType: keyof typeof securityConfig.rateLimit.api) {
  const config = securityConfig.rateLimit.api[apiType]
  return createRateLimiter(config)
}

/**
 * Higher-order function to wrap handlers with rate limiting
 */
export function withRateLimit<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>,
  options?: RateLimitOptions
) {
  const rateLimiter = createRateLimiter(options)

  return async function rateLimitedHandler(req: NextRequest, ...args: T): Promise<NextResponse> {
    return rateLimiter(req, async (request) => {
      try {
        return await handler(request, ...args)
      } catch (error) {
        logger.error('Handler error', error as Error)
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Internal server error' },
          { status: 500 }
        )
      }
    })
  }
}

/**
 * Combine rate limiting with other middleware
 */
export function composeMiddleware<T extends any[]>(
  ...middlewares: Array<(req: NextRequest, ...args: T) => Promise<NextResponse>>
) {
  return async function composedHandler(req: NextRequest, ...args: T): Promise<NextResponse> {
    let result = req

    for (const middleware of middlewares) {
      const response = await middleware(result as NextRequest, ...args)
      if (response.status !== 200) {
        return response
      }
      result = response as any
    }

    return result as NextResponse
  }
}

/**
 * Get rate limiter statistics (development only)
 */
export function getRateLimiterStats() {
  const entries = Array.from(rateLimitStore.entries())
  const now = Date.now()

  // Calculate stats
  const stats = {
    storeSize: rateLimitStore.size,
    maxSize: MAX_STORE_SIZE,
    memoryUsage: process.memoryUsage().heapUsed,
    oldestExpiry: entries.length > 0 ? Math.min(...entries.map(([, e]) => e.resetTime)) : 0,
    newestExpiry: entries.length > 0 ? Math.max(...entries.map(([, e]) => e.resetTime)) : 0,
    topIps: entries
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([ip, entry]) => ({
        ip,
        count: entry.count,
        resetTime: entry.resetTime,
      })),
  }

  return stats
}
