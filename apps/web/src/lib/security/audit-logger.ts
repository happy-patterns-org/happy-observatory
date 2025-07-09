import { logger } from '@/lib/logger-server'

export type SecurityEvent =
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.logout'
  | 'auth.token.invalid'
  | 'auth.token.expired'
  | 'access.denied.permission'
  | 'access.denied.project'
  | 'rate_limit.exceeded'
  | 'validation.failed'
  | 'security.error'

interface SecurityLogContext {
  userId?: string
  username?: string
  ip?: string
  userAgent?: string
  resource?: string
  projectId?: string
  action?: string
  reason?: string
  [key: string]: any
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeLogData(data: any): any {
  if (!data) return data

  // Deep clone to avoid mutating original
  const sanitized = JSON.parse(JSON.stringify(data))

  // List of sensitive field names to redact
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'jwt',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
    'session',
    'creditCard',
    'ssn',
    'email', // Partially redact
    'phone', // Partially redact
  ]

  function redactObject(obj: any): void {
    for (const key in obj) {
      const lowerKey = key.toLowerCase()

      // Check if field name contains sensitive keywords
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        if (lowerKey.includes('email') && typeof obj[key] === 'string') {
          // Partially redact email
          const parts = obj[key].split('@')
          if (parts.length === 2) {
            const [local, domain] = parts
            obj[key] = `${local.substring(0, 2)}***@${domain}`
          } else {
            obj[key] = '[REDACTED]'
          }
        } else if (lowerKey.includes('phone') && typeof obj[key] === 'string') {
          // Partially redact phone
          obj[key] = obj[key].replace(/\d(?=\d{4})/g, '*')
        } else {
          obj[key] = '[REDACTED]'
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        redactObject(obj[key])
      }
    }
  }

  redactObject(sanitized)
  return sanitized
}

/**
 * Log security events for audit trail
 */
export function logSecurityEvent(
  event: SecurityEvent,
  context: SecurityLogContext,
  level: 'info' | 'warn' | 'error' = 'info'
) {
  const sanitizedContext = sanitizeLogData(context)

  const logEntry = {
    type: 'SECURITY_EVENT',
    event,
    timestamp: new Date().toISOString(),
    ...sanitizedContext,
  }

  switch (level) {
    case 'error':
      logger.error(`Security Event: ${event}`, new Error(event), logEntry)
      break
    case 'warn':
      logger.warn(`Security Event: ${event}`, logEntry)
      break
    default:
      logger.info(`Security Event: ${event}`, logEntry)
  }

  // In production, you might also:
  // - Send to a SIEM system
  // - Store in a dedicated audit log database
  // - Trigger alerts for critical events
}

/**
 * Extract request metadata for security logging
 */
export function getRequestMetadata(request: Request): SecurityLogContext {
  return {
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    method: request.method,
    url: request.url,
  }
}
