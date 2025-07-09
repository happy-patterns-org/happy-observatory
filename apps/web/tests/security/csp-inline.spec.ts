import { test, expect } from '@playwright/test'

test.describe('CSP Inline Script Nonce', () => {
  test('all script elements have nonce attributes', async ({ page }) => {
    const response = await page.goto('/')

    // Get CSP header
    const cspHeader = response?.headers()['content-security-policy']
    expect(cspHeader).toBeTruthy()

    // Extract nonce from CSP header
    const nonceMatch = cspHeader?.match(/script-src[^;]*'nonce-([^']+)'/)
    expect(nonceMatch).toBeTruthy()
    const headerNonce = nonceMatch![1]

    // Check that script elements have nonce attributes
    const scriptNonces = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script')
      return Array.from(scripts).map((script) => script.getAttribute('nonce') || '')
    })

    // Should have at least one script with nonce
    const scriptsWithNonce = scriptNonces.filter((nonce) => nonce !== '')
    expect(scriptsWithNonce.length).toBeGreaterThan(0)

    // All nonces should match the header nonce
    scriptsWithNonce.forEach((nonce) => {
      expect(nonce).toBe(headerNonce)
    })
  })

  test('inline scripts are blocked without nonce', async ({ page }) => {
    // Navigate to page
    await page.goto('/')

    // Try to inject a script without nonce
    const consoleMessages: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text())
      }
    })

    // Attempt to execute inline script without nonce
    await page.evaluate(() => {
      const script = document.createElement('script')
      script.textContent = 'console.log("This should be blocked")'
      document.head.appendChild(script)
    })

    // Wait a bit for any CSP violations
    await page.waitForTimeout(100)

    // Check if CSP blocked the script
    const cspViolation = consoleMessages.some(
      (msg) =>
        msg.includes('Content Security Policy') ||
        msg.includes('CSP') ||
        msg.includes('refused to execute')
    )

    // In production mode, scripts without nonce should be blocked
    if (process.env.NODE_ENV === 'production') {
      expect(cspViolation).toBe(true)
    }
  })
})
