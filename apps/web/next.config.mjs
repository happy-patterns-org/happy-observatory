/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Add base path if configured
  basePath: process.env.BASE_PATH || '',

  // Enable SWC minification
  swcMinify: true,

  // Modern image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: ['localhost', 'github.com', 'avatars.githubusercontent.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Experimental features
  experimental: {
    // Server Components optimizations
    serverComponentsExternalPackages: ['@happy-observatory/design-system'],
  },

  // Add transpilePackages if needed
  transpilePackages: [],

  // Ensure proper error handling
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // WebSocket and API proxying for development
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_SERVER_URL || 'http://localhost:8080'

    return [
      // Project-scoped WebSocket connections
      {
        source: '/ws/projects/:projectId',
        destination: `${bridgeUrl}/ws/projects/:projectId`,
      },
      // Legacy global WebSocket (for backwards compatibility)
      {
        source: '/ws',
        destination: `${apiUrl}/ws`,
      },
      // Project-scoped bridge server API
      {
        source: '/api/bridge/projects/:projectId/:path*',
        destination: `${bridgeUrl}/api/projects/:projectId/:path*`,
      },
      // Legacy DevKit API
      {
        source: '/api/devkit/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },

  // Security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: isDev ? '' : 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: isDev
              ? '' // Relaxed CSP for development
              : [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-eval'", // Next.js needs unsafe-eval for development
                  "style-src 'self' 'unsafe-inline'", // Next.js CSS-in-JS requires unsafe-inline
                  "img-src 'self' data: https: blob:",
                  "font-src 'self'",
                  "connect-src 'self' ws: wss: http://localhost:* https://api.anthropic.com",
                  "frame-ancestors 'none'",
                  "base-uri 'self'",
                  "form-action 'self'",
                ].join('; '),
          },
        ].filter((header) => header.value !== ''), // Remove empty headers
      },
    ]
  },
}

export default nextConfig
