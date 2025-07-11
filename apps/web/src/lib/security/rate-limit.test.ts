import { createRateLimiter, withRateLimit, getApiRateLimiter, getRateLimiterStats, clearRateLimiterStore } from './rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { vi } from 'vitest'

// Mock the env module to enable proxy headers
vi.mock('@/lib/env', () => ({
  env: {
    TRUST_PROXY_HEADERS: 'true',
    NODE_ENV: 'test',
  }
}))

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearRateLimiterStore()
  })

  afterEach(() => {
    vi.useRealTimers()
    clearRateLimiterStore()
  })

  describe('createRateLimiter', () => {
    it('allows requests within limit', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        max: 10,
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const handler = async () => NextResponse.json({ success: true })
      
      for (let i = 0; i < 10; i++) {
        const result = await limiter(request, handler)
        expect(result).toBeInstanceOf(NextResponse)
        const headers = result.headers
        expect(headers.get('x-ratelimit-remaining')).toBe(String(9 - i))
      }
    })

    it('blocks requests exceeding limit', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const handler = async () => NextResponse.json({ success: true })
      
      // First two requests should pass
      for (let i = 0; i < 2; i++) {
        const result = await limiter(request, handler)
        expect(result.status).not.toBe(429)
      }

      // Third request should be blocked
      const result = await limiter(request, handler)
      expect(result.status).toBe(429)
      const body = await result.json()
      expect(body.error).toContain('Too many requests')
    })

    it('resets limit after window expires', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const handler = async () => NextResponse.json({ success: true })
      
      // First request should pass
      let result = await limiter(request, handler)
      expect(result.status).not.toBe(429)

      // Second request should be blocked
      result = await limiter(request, handler)
      expect(result.status).toBe(429)

      // Advance time past the window
      vi.advanceTimersByTime(61000)

      // Third request should pass
      result = await limiter(request, handler)
      expect(result.status).not.toBe(429)
    })

    it('tracks different identifiers separately', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      const request1 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const request2 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.2',
        },
      })

      const handler = async () => NextResponse.json({ success: true })
      
      // Both requests should pass
      const result1 = await limiter(request1, handler)
      expect(result1.status).not.toBe(429)

      const result2 = await limiter(request2, handler)
      expect(result2.status).not.toBe(429)
    })
  })

  describe('getApiRateLimiter', () => {
    it('returns rate limiter for valid API type', () => {
      const limiter = getApiRateLimiter('auth')
      expect(limiter).toBeDefined()
      expect(typeof limiter).toBe('function')
    })

    it('returns rate limiter for projects API', () => {
      const limiter = getApiRateLimiter('projects')
      expect(limiter).toBeDefined()
    })

    it('returns rate limiter for agents API', () => {
      const limiter = getApiRateLimiter('agents')
      expect(limiter).toBeDefined()
    })
  })

  describe('withRateLimit', () => {
    it('applies rate limiting to handler', async () => {
      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ message: 'success' })
      )

      const wrappedHandler = withRateLimit(handler, {
        windowMs: 60000,
        max: 1,
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      // First request should pass
      let response = await wrappedHandler(request)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(200)

      // Second request should be blocked
      response = await wrappedHandler(request)
      expect(handler).toHaveBeenCalledTimes(1) // Handler not called again
      expect(response.status).toBe(429)
    })

    it('passes through handler arguments', async () => {
      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ message: 'success' })
      )

      const wrappedHandler = withRateLimit(handler, {
        windowMs: 60000,
        max: 10,
      })

      const request = new NextRequest('http://localhost:3000/api/test')
      const extraArg = { foo: 'bar' }

      await wrappedHandler(request, extraArg)

      expect(handler).toHaveBeenCalledWith(request, extraArg)
    })
  })

  describe('getRateLimiterStats', () => {
    it('returns current rate limiter statistics', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 10,
      })

      const request1 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const request2 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.2',
        },
      })

      const handler = async () => NextResponse.json({ success: true })
      
      await limiter(request1, handler)
      await limiter(request1, handler)
      await limiter(request2, handler)

      const stats = getRateLimiterStats()

      expect(stats.storeSize).toBe(2) // Two different IPs
      expect(stats.topIps).toHaveLength(2)
      expect(stats.topIps[0]?.count).toBe(2) // First IP made 2 requests
      expect(stats.topIps[1]?.count).toBe(1) // Second IP made 1 request
    })
  })

  describe('cleanup', () => {
    it('handles expired entries correctly', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000, // 1 second for faster test
        max: 1,
      })

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      const handler = async () => NextResponse.json({ success: true })
      await limiter(request, handler)

      let stats = getRateLimiterStats()
      expect(stats.storeSize).toBe(1)

      // Advance time past the window to expire the entry
      vi.advanceTimersByTime(2000) // 2 seconds, past the 1 second window
      
      // Make another request from the same IP - should be allowed since window expired
      const result = await limiter(request, handler)
      expect(result.status).not.toBe(429) // Should not be rate limited
      
      // The store now has the new entry for the same IP
      stats = getRateLimiterStats()
      expect(stats.storeSize).toBe(1)
      expect(stats.topIps[0]?.count).toBe(1) // Reset count after window expiry
    })
  })
})