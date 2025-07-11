/**
 * Security configuration for Happy Observatory
 */

export const securityConfig = {
  // Rate limiting configuration
  rateLimit: {
    // Global rate limit
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
    },
    // API-specific rate limits
    api: {
      auth: {
        windowMs: 15 * 60 * 1000,
        max: 5, // Stricter limit for auth endpoints
      },
      projects: {
        windowMs: 1 * 60 * 1000,
        max: 30,
      },
      agents: {
        windowMs: 1 * 60 * 1000,
        max: 60,
      },
      telemetry: {
        windowMs: 1 * 60 * 1000,
        max: 120, // Higher limit for telemetry data
      },
    },
  },

  // CORS configuration
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
        : true,
    credentials: true,
    optionsSuccessStatus: 200,
  },

  // Session configuration
  session: {
    secret:
      process.env.SESSION_SECRET ||
      (() => {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('SESSION_SECRET environment variable is required in production')
        }
        // Generate a random secret for development only
        const devSecret = require('node:crypto').randomBytes(32).toString('hex')
        console.log(`[DEV] Generated session secret: ${devSecret.substring(0, 8)}...`)
        return devSecret
      })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax' as const,
    },
  },

  // JWT configuration
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      (() => {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET environment variable is required in production')
        }
        // Generate a random secret for development only
        const devSecret = require('node:crypto').randomBytes(32).toString('hex')
        console.log(`[DEV] Generated JWT secret: ${devSecret.substring(0, 8)}...`)
        return devSecret
      })(),
    expiresIn: '24h',
  },

  // Allowed file types for uploads
  allowedFileTypes: [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.json',
    '.yml',
    '.yaml',
    '.md',
    '.mdx',
    '.css',
    '.scss',
    '.sass',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.pdf',
    '.txt',
  ],

  // Maximum file sizes
  maxFileSizes: {
    image: 5 * 1024 * 1024, // 5MB
    document: 10 * 1024 * 1024, // 10MB
    code: 1 * 1024 * 1024, // 1MB
  },

  // Sanitization rules
  sanitization: {
    // HTML tags to allow in user content
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre'],
    allowedAttributes: {
      a: ['href', 'title'],
    },
    // Disallow data URLs except for images
    allowedSchemes: ['http', 'https', 'mailto'],
  },
}
