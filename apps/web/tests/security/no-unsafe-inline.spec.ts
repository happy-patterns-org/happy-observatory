import { expect, test } from '@playwright/test'

test.describe('Security Regression Tests', () => {
  test('No unsafe-inline in script-src CSP directive', async ({ page }) => {
    // Only run in production mode
    if (process.env.NODE_ENV !== 'production') {
      test.skip()
      return
    }

    const response = await page.goto('/')
    const cspHeader = response?.headers()['content-security-policy']

    expect(cspHeader).toBeTruthy()

    // Parse CSP directives
    const directives = cspHeader?.split(';').map((d) => d.trim()) || []
    const scriptDirective = directives.find((d) => d.startsWith('script-src'))

    // Ensure script-src exists and does NOT contain unsafe-inline
    expect(scriptDirective).toBeTruthy()
    expect(scriptDirective).not.toContain('unsafe-inline')

    // Should have nonce instead
    expect(scriptDirective).toMatch(/nonce-[A-Za-z0-9+/=]+/)
  })

  test('Security headers are present', async ({ page }) => {
    const response = await page.goto('/')
    const headers = response?.headers()

    if (!headers) {
      throw new Error('No headers received from response')
    }

    // Check all required security headers
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')

    // HSTS in production only
    if (process.env.NODE_ENV === 'production' && headers['strict-transport-security']) {
      expect(headers['strict-transport-security']).toContain('max-age=')
      expect(headers['strict-transport-security']).toContain('includeSubDomains')
    }
  })

  test('Rate limit headers are present on API requests', async ({ request }) => {
    const response = await request.get('/api/health')
    const headers = response.headers()

    // Should have rate limit headers
    expect(headers['x-ratelimit-limit']).toBeTruthy()
    expect(headers['x-ratelimit-remaining']).toBeTruthy()
    expect(headers['x-ratelimit-reset']).toBeTruthy()
  })

  test('Authentication required for protected endpoints', async ({ request }) => {
    // Try to access protected endpoint without auth
    const response = await request.get('/api/projects/test-project/agents/status')

    expect(response.status()).toBe(401)

    const body = await response.json()
    expect(body.error).toContain('Authentication required')
  })

  test('Invalid JWT is rejected', async ({ request }) => {
    const response = await request.get('/api/projects', {
      headers: {
        Authorization: 'Bearer invalid.jwt.token',
      },
    })

    expect(response.status()).toBe(401)

    const body = await response.json()
    expect(body.error).toContain('Invalid authentication token')
  })

  test('Schema validation rejects malformed requests', async ({ request }) => {
    // Login with invalid data
    const response = await request.post('/api/auth/login', {
      data: {
        // Missing password
        username: 'test',
      },
    })

    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.error).toContain('Invalid request')
    expect(body.details).toBeTruthy()
  })
})
