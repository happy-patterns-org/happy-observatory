import { expect, test } from '@playwright/test'

test.describe('Content Security Policy', () => {
  test('CSP nonce is consistent across all inline scripts', async ({ page }) => {
    const response = await page.goto('/')
    expect(response).toBeTruthy()

    // Extract nonce from CSP header
    const cspHeader = response?.headers()['content-security-policy']
    expect(cspHeader).toBeTruthy()

    const nonceMatch = cspHeader?.match(/'nonce-([^']+)'/)
    expect(nonceMatch).toBeTruthy()
    const headerNonce = nonceMatch?.[1]

    // Get all script elements with nonce attribute
    const scriptNonces = await page.$$eval('script[nonce]', (elements) =>
      elements.map((el) => el.getAttribute('nonce'))
    )

    // Verify all nonces match the header nonce
    expect(scriptNonces.length).toBeGreaterThan(0)
    scriptNonces.forEach((nonce) => {
      expect(nonce).toBe(headerNonce)
    })

    // Ensure no unsafe-inline for scripts in production
    if (process.env.NODE_ENV === 'production') {
      expect(cspHeader).not.toContain("script-src 'self' 'unsafe-inline'")
    }
  })

  test('CSP allows unsafe-inline only for styles', async ({ page }) => {
    const response = await page.goto('/')
    const cspHeader = response?.headers()['content-security-policy']

    // Parse CSP directives
    const directives = cspHeader?.split(';').map((d) => d.trim()) || []
    const styleDirective = directives.find((d) => d.startsWith('style-src'))
    const scriptDirective = directives.find((d) => d.startsWith('script-src'))

    // Styles can have unsafe-inline (Next.js CSS-in-JS requirement)
    expect(styleDirective).toContain('unsafe-inline')

    // Scripts should NOT have unsafe-inline in production
    if (process.env.NODE_ENV === 'production') {
      expect(scriptDirective).not.toContain('unsafe-inline')
    }
  })

  test('Different requests get different nonces', async ({ page }) => {
    // First request
    const response1 = await page.goto('/')
    const csp1 = response1?.headers()['content-security-policy']
    const nonce1 = csp1?.match(/'nonce-([^']+)'/)?.[1]

    // Second request
    const response2 = await page.goto('/workspace')
    const csp2 = response2?.headers()['content-security-policy']
    const nonce2 = csp2?.match(/'nonce-([^']+)'/)?.[1]

    // Nonces should be different for security
    expect(nonce1).toBeTruthy()
    expect(nonce2).toBeTruthy()
    expect(nonce1).not.toBe(nonce2)
  })
})
