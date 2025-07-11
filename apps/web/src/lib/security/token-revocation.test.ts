import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  tokenRevocationStore,
  isTokenRevoked,
  revokeToken,
  checkTokenRevocation,
  getRevocationStats,
} from './token-revocation'
import { logger } from '@/lib/logger-server'

// Mock the logger
vi.mock('@/lib/logger-server', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('Token Revocation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    // Clear the store
    const store = tokenRevocationStore as any
    store.revokedTokens.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('TokenRevocationStore', () => {
    describe('revoke', () => {
      it('should add token to revocation list', () => {
        const jti = 'test-jti-123'
        const expiresAt = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

        tokenRevocationStore.revoke(jti, expiresAt)

        expect(tokenRevocationStore.isRevoked(jti)).toBe(true)
      })

      it('should log when token is revoked', () => {
        const jti = 'test-jti-456'
        const expiresAt = Math.floor(Date.now() / 1000) + 3600

        tokenRevocationStore.revoke(jti, expiresAt)

        expect(vi.mocked(logger.info)).toHaveBeenCalledWith('Token revoked', { jti })
      })
    })

    describe('isRevoked', () => {
      it('should return true for revoked tokens', () => {
        const jti = 'revoked-token'
        const expiresAt = Math.floor(Date.now() / 1000) + 3600

        tokenRevocationStore.revoke(jti, expiresAt)

        expect(tokenRevocationStore.isRevoked(jti)).toBe(true)
      })

      it('should return false for non-revoked tokens', () => {
        expect(tokenRevocationStore.isRevoked('non-existent-token')).toBe(false)
      })

      it('should return false and cleanup expired tokens', () => {
        const jti = 'expired-token'
        const expiresAt = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago

        // Directly set in the store to simulate an expired token
        const store = tokenRevocationStore as any
        store.revokedTokens.set(jti, expiresAt)

        // Should return false since token is expired
        expect(tokenRevocationStore.isRevoked(jti)).toBe(false)
        
        // Should have been cleaned up
        expect(store.revokedTokens.has(jti)).toBe(false)
      })
    })

    describe('revokeAllForUser', () => {
      it('should log revocation for user', () => {
        const userId = 'user-123'
        const beforeTimestamp = Date.now()

        tokenRevocationStore.revokeAllForUser(userId, beforeTimestamp)

        expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
          'All tokens revoked for user',
          { userId, beforeTimestamp }
        )
      })
    })

    describe('cleanup', () => {
      it('should remove expired tokens periodically', () => {
        const store = tokenRevocationStore as any
        const now = Math.floor(Date.now() / 1000)

        // Add mix of expired and valid tokens
        store.revokedTokens.set('expired-1', now - 100)
        store.revokedTokens.set('expired-2', now - 200)
        store.revokedTokens.set('valid-1', now + 3600)
        store.revokedTokens.set('valid-2', now + 7200)

        // Clear previous debug calls
        vi.mocked(logger.debug).mockClear()

        // Call cleanup directly since we need to test the cleanup method
        store.cleanup()

        // Check that expired tokens were removed
        expect(store.revokedTokens.has('expired-1')).toBe(false)
        expect(store.revokedTokens.has('expired-2')).toBe(false)
        expect(store.revokedTokens.has('valid-1')).toBe(true)
        expect(store.revokedTokens.has('valid-2')).toBe(true)

        expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
          expect.stringContaining('Token revocation cleanup: removed 2 expired entries')
        )
      })

      it('should not log when no tokens are cleaned up', () => {
        const store = tokenRevocationStore as any
        const now = Math.floor(Date.now() / 1000)

        // Add only valid tokens
        store.revokedTokens.set('valid-1', now + 3600)
        store.revokedTokens.set('valid-2', now + 7200)

        vi.mocked(logger.debug).mockClear()

        // Call cleanup directly
        store.cleanup()

        expect(vi.mocked(logger.debug)).not.toHaveBeenCalled()
      })
    })
  })

  describe('Module functions', () => {
    describe('isTokenRevoked', () => {
      it('should check if token is revoked', async () => {
        const jti = 'async-check-token'
        const expiresAt = Math.floor(Date.now() / 1000) + 3600

        expect(await isTokenRevoked(jti)).toBe(false)

        revokeToken(jti, expiresAt)

        expect(await isTokenRevoked(jti)).toBe(true)
      })
    })

    describe('revokeToken', () => {
      it('should revoke a token', () => {
        const jti = 'revoke-test'
        const expiresAt = Math.floor(Date.now() / 1000) + 3600

        revokeToken(jti, expiresAt)

        expect(tokenRevocationStore.isRevoked(jti)).toBe(true)
      })
    })

    describe('checkTokenRevocation', () => {
      it('should return true for undefined JTI', async () => {
        expect(await checkTokenRevocation(undefined)).toBe(true)
      })

      it('should return false for revoked tokens', async () => {
        const jti = 'check-revoked'
        const expiresAt = Math.floor(Date.now() / 1000) + 3600

        revokeToken(jti, expiresAt)

        expect(await checkTokenRevocation(jti)).toBe(false)
      })

      it('should return true for non-revoked tokens', async () => {
        expect(await checkTokenRevocation('non-revoked-jti')).toBe(true)
      })
    })

    describe('getRevocationStats', () => {
      it('should return store statistics', () => {
        const now = Math.floor(Date.now() / 1000)
        
        // Add some tokens
        revokeToken('token-1', now + 3600)
        revokeToken('token-2', now + 7200)
        revokeToken('token-3', now + 1800)

        const stats = getRevocationStats()

        expect(stats.count).toBe(3)
        expect(stats.memoryUsage).toBeGreaterThan(0)
        expect(stats.tokens).toHaveLength(3)
        
        // Should be sorted by expiry (latest first)
        expect(stats.tokens[0].jti).toBe('token-2')
        expect(stats.tokens[1].jti).toBe('token-1')
        expect(stats.tokens[2].jti).toBe('token-3')
        
        // Check time until expiry calculation
        expect(stats.tokens[0].timeUntilExpiry).toBeCloseTo(7200, -1)
        expect(stats.tokens[1].timeUntilExpiry).toBeCloseTo(3600, -1)
        expect(stats.tokens[2].timeUntilExpiry).toBeCloseTo(1800, -1)
      })

      it('should handle empty store', () => {
        const stats = getRevocationStats()

        expect(stats.count).toBe(0)
        expect(stats.tokens).toEqual([])
      })

      it('should handle expired tokens in stats', () => {
        const now = Math.floor(Date.now() / 1000)
        
        // Add an expired token
        const store = tokenRevocationStore as any
        store.revokedTokens.set('expired-token', now - 3600)

        const stats = getRevocationStats()

        expect(stats.tokens[0].timeUntilExpiry).toBe(0)
      })
    })
  })

  describe('Process lifecycle', () => {
    it('should clean up interval on process exit', () => {
      const store = tokenRevocationStore as any
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      
      // Simulate process exit
      const beforeExitListeners = process.listeners('beforeExit')
      const cleanupListener = beforeExitListeners[beforeExitListeners.length - 1]
      
      // Should have an interval
      expect(store.cleanupInterval).toBeTruthy()
      
      // Trigger cleanup
      cleanupListener()
      
      expect(clearIntervalSpy).toHaveBeenCalled()
      expect(store.cleanupInterval).toBeNull()
    })
  })

  describe('Edge cases', () => {
    it('should handle tokens expiring at exact current time', () => {
      const now = Math.floor(Date.now() / 1000)
      const jti = 'exact-expiry'
      
      // Set token to expire exactly now (which means it's already expired since Date.now() > now * 1000 is false)
      tokenRevocationStore.revoke(jti, now)
      
      // At exact expiry time, the token is considered expired (Date.now() > expiresAt * 1000 is false when equal)
      expect(tokenRevocationStore.isRevoked(jti)).toBe(false)
      
      // Set token to expire 1 second in the future
      tokenRevocationStore.revoke(jti, now + 1)
      
      // Should still be considered revoked
      expect(tokenRevocationStore.isRevoked(jti)).toBe(true)
      
      // Advance time by 2 seconds
      vi.setSystemTime(new Date((now + 2) * 1000))
      
      // Now should be expired and return false
      expect(tokenRevocationStore.isRevoked(jti)).toBe(false)
    })

    it('should handle very large expiry times', () => {
      const jti = 'far-future'
      const farFuture = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
      
      tokenRevocationStore.revoke(jti, farFuture)
      
      expect(tokenRevocationStore.isRevoked(jti)).toBe(true)
      
      const stats = getRevocationStats()
      expect(stats.tokens[0].timeUntilExpiry).toBeGreaterThan(365 * 24 * 60 * 60 - 10)
    })
  })
})