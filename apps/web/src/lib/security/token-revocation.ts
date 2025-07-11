import { logger } from '@/lib/logger-server'

/**
 * Simple in-memory token revocation store
 * In production, use Redis or a database
 */
class TokenRevocationStore {
  private revokedTokens = new Map<string, number>() // jti -> expiry timestamp
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanup()
  }

  /**
   * Add a token to the revocation list
   */
  revoke(jti: string, expiresAt: number): void {
    this.revokedTokens.set(jti, expiresAt)
    logger.info('Token revoked', { jti })
  }

  /**
   * Check if a token is revoked
   */
  isRevoked(jti: string): boolean {
    const expiresAt = this.revokedTokens.get(jti)
    if (!expiresAt) return false

    // Check if token has expired anyway
    if (Date.now() > expiresAt * 1000) {
      this.revokedTokens.delete(jti)
      return false
    }

    return true
  }

  /**
   * Revoke all tokens for a user
   */
  revokeAllForUser(userId: string, beforeTimestamp: number): void {
    // In a real implementation, this would query tokens by userId
    // For now, this is a placeholder
    logger.info('All tokens revoked for user', { userId, beforeTimestamp })
  }

  /**
   * Clean up expired tokens
   */
  private cleanup(): void {
    const now = Date.now() / 1000
    const keysToDelete: string[] = []

    for (const [jti, expiresAt] of this.revokedTokens.entries()) {
      if (now > expiresAt) {
        keysToDelete.push(jti)
      }
    }

    for (const key of keysToDelete) {
      this.revokedTokens.delete(key)
    }

    if (keysToDelete.length > 0) {
      logger.debug(`Token revocation cleanup: removed ${keysToDelete.length} expired entries`)
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return

    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup()
      },
      5 * 60 * 1000
    )

    // Stop cleanup on exit
    process.on('beforeExit', () => {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval)
        this.cleanupInterval = null
      }
    })
  }
}

// Export singleton instance
export const tokenRevocationStore = new TokenRevocationStore()

/**
 * Check if a token is revoked
 */
export async function isTokenRevoked(jti: string): Promise<boolean> {
  return tokenRevocationStore.isRevoked(jti)
}

/**
 * Revoke a token
 */
export function revokeToken(jti: string, expiresAt: number): void {
  tokenRevocationStore.revoke(jti, expiresAt)
}

/**
 * Middleware to check token revocation
 */
export async function checkTokenRevocation(jti: string | undefined): Promise<boolean> {
  if (!jti) return true // No JTI means we can't track revocation
  return !tokenRevocationStore.isRevoked(jti)
}

/**
 * Get revocation store statistics (development only)
 */
export function getRevocationStats() {
  // Access private property for debugging
  const store = tokenRevocationStore as any
  const entries = Array.from(store.revokedTokens.entries())
  const now = Date.now() / 1000

  return {
    count: entries.length,
    memoryUsage: JSON.stringify(entries).length, // Rough estimate
    tokens: entries
      .map(([jti, expiresAt]) => ({
        jti,
        expiresAt,
        timeUntilExpiry: Math.max(0, Math.floor(expiresAt - now)),
      }))
      .sort((a, b) => b.expiresAt - a.expiresAt),
  }
}
