import { SERVICE_URLS } from '@business-org/shared-config-ts/src/index'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Log all requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Middleware] ${new Date().toISOString()} ${request.method} ${request.url}`)
  }

  // Generate CSP nonce for this request using Web Crypto API
  const nonceArray = new Uint8Array(16)
  crypto.getRandomValues(nonceArray)
  const nonce = btoa(String.fromCharCode(...nonceArray))

  // Clone request headers and add nonce
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // Create response with nonce in headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Also set the nonce as a response header for the layout to access
  response.headers.set('x-nonce', nonce)

  // Set security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Set CSP with nonce
  // Hash for the theme initialization script (provided by browser error)
  const themeScriptHash = "'sha256-UF0dhkvpNCh6Kb/7PGA69028B2YCwUkzhkStnGpAjRQ='"

  const scriptSrc =
    process.env.NODE_ENV === 'development'
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' ${themeScriptHash}` // unsafe-eval needed for Next.js dev mode
      : `script-src 'self' 'nonce-${nonce}' ${themeScriptHash}`

  const cspHeader = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'", // unsafe-inline required for Next.js and Tailwind CSS
    "img-src 'self' data: https: blob:",
    "font-src 'self'",
    `connect-src 'self' ws: wss: https://api.anthropic.com ${SERVICE_URLS.BRIDGE_SERVER} ${SERVICE_URLS.BRIDGE_SERVER.replace(/^http/, 'ws')} ${SERVICE_URLS.MCP_DAEMON} ${SERVICE_URLS.OBSERVATORY}`,
    "frame-src 'self' http://localhost:3001", // TODO: Replace with SERVICE_URLS.nexusConsole when available
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspHeader)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
