/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable SWC minification
  swcMinify: true,
  
  // Modern image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Experimental features
  experimental: {
    // React compiler for optimization
    reactCompiler: true,
    // Server Components optimizations
    serverComponentsExternalPackages: ['@happy-observatory/design-system'],
    // PPR (Partial Prerendering)
    ppr: true,
  },
  
  // WebSocket and API proxying for development
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        source: '/ws',
        destination: `${apiUrl}/ws`,
      },
      {
        source: '/api/devkit/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
  
  // Security headers
  async headers() {
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
        ],
      },
    ]
  },
}

export default nextConfig
