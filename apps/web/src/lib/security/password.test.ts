import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  passwordRequirements,
} from './password'
import bcrypt from 'bcrypt'

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

describe('Password Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash a password with correct salt rounds', async () => {
      const password = 'TestPassword123!'
      const hashedPassword = '$2b$12$mockedHashValue'

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword)

      const result = await hashPassword(password)

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(result).toBe(hashedPassword)
    })

    it('should handle empty password', async () => {
      const hashedPassword = '$2b$12$mockedHashForEmpty'

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword)

      const result = await hashPassword('')

      expect(bcrypt.hash).toHaveBeenCalledWith('', 12)
      expect(result).toBe(hashedPassword)
    })

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+{}|:"<>?'
      const hashedPassword = '$2b$12$mockedHashForSpecial'

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword)

      const result = await hashPassword(password)

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(result).toBe(hashedPassword)
    })

    it('should handle very long passwords', async () => {
      const password = 'a'.repeat(1000)
      const hashedPassword = '$2b$12$mockedHashForLong'

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword)

      const result = await hashPassword(password)

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(result).toBe(hashedPassword)
    })

    it('should throw error when bcrypt fails', async () => {
      const password = 'TestPassword123!'
      const error = new Error('Bcrypt hash failed')

      vi.mocked(bcrypt.hash).mockRejectedValue(error)

      await expect(hashPassword(password)).rejects.toThrow('Bcrypt hash failed')
    })
  })

  describe('verifyPassword', () => {
    it('should return true for matching password', async () => {
      const password = 'TestPassword123!'
      const hash = '$2b$12$mockedHashValue'

      vi.mocked(bcrypt.compare).mockResolvedValue(true)

      const result = await verifyPassword(password, hash)

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash)
      expect(result).toBe(true)
    })

    it('should return false for non-matching password', async () => {
      const password = 'WrongPassword123!'
      const hash = '$2b$12$mockedHashValue'

      vi.mocked(bcrypt.compare).mockResolvedValue(false)

      const result = await verifyPassword(password, hash)

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash)
      expect(result).toBe(false)
    })

    it('should handle empty password', async () => {
      const password = ''
      const hash = '$2b$12$mockedHashValue'

      vi.mocked(bcrypt.compare).mockResolvedValue(false)

      const result = await verifyPassword(password, hash)

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash)
      expect(result).toBe(false)
    })

    it('should handle empty hash', async () => {
      const password = 'TestPassword123!'
      const hash = ''

      vi.mocked(bcrypt.compare).mockResolvedValue(false)

      const result = await verifyPassword(password, hash)

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash)
      expect(result).toBe(false)
    })

    it('should throw error when bcrypt fails', async () => {
      const password = 'TestPassword123!'
      const hash = '$2b$12$mockedHashValue'
      const error = new Error('Bcrypt compare failed')

      vi.mocked(bcrypt.compare).mockRejectedValue(error)

      await expect(verifyPassword(password, hash)).rejects.toThrow('Bcrypt compare failed')
    })
  })

  describe('passwordRequirements', () => {
    it('should have correct default requirements', () => {
      expect(passwordRequirements).toEqual({
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      })
    })
  })

  describe('validatePasswordStrength', () => {
    it('should validate a strong password', () => {
      const password = 'StrongP@ssw0rd'

      const result = validatePasswordStrength(password)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should detect password too short', () => {
      const password = 'Sh0rt!'

      const result = validatePasswordStrength(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should detect missing uppercase letter', () => {
      const password = 'lowercas3!'

      const result = validatePasswordStrength(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('should detect missing lowercase letter', () => {
      const password = 'UPPERCAS3!'

      const result = validatePasswordStrength(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should detect missing number', () => {
      const password = 'NoNumbers!'

      const result = validatePasswordStrength(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should detect missing special character', () => {
      const password = 'NoSpecial123'

      const result = validatePasswordStrength(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('should detect multiple validation errors', () => {
      const password = 'short'

      const result = validatePasswordStrength(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(4)
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('should handle empty password', () => {
      const password = ''

      const result = validatePasswordStrength(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(5)
    })

    it('should accept various special characters', () => {
      const specialChars = '!@#$%^&*(),.?":{}|<>'
      
      specialChars.split('').forEach(char => {
        const password = `Passw0rd${char}`
        const result = validatePasswordStrength(password)
        
        expect(result.isValid).toBe(true)
        expect(result.errors).toEqual([])
      })
    })

    it('should handle password at exact minimum length', () => {
      const password = 'Pass@w0r' // Exactly 8 characters

      const result = validatePasswordStrength(password)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should handle very long passwords', () => {
      const password = 'Very' + 'Long'.repeat(50) + 'Passw0rd!'

      const result = validatePasswordStrength(password)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should handle unicode characters', () => {
      const password = 'Pássw0rd!' // Contains accented character

      const result = validatePasswordStrength(password)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should handle password with all requirements at boundaries', () => {
      const password = 'Aa1!aaaa' // One uppercase, one number, one special char, exactly 8 chars

      const result = validatePasswordStrength(password)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })

  describe('Integration scenarios', () => {
    it('should hash and verify a password correctly', async () => {
      const password = 'TestPassword123!'
      const hash = '$2b$12$mockedHashValue'

      // Mock hash creation
      vi.mocked(bcrypt.hash).mockResolvedValue(hash)
      
      // Hash the password
      const hashedPassword = await hashPassword(password)
      expect(hashedPassword).toBe(hash)

      // Mock verification - correct password
      vi.mocked(bcrypt.compare).mockResolvedValue(true)
      
      const isValid = await verifyPassword(password, hashedPassword)
      expect(isValid).toBe(true)

      // Mock verification - wrong password
      vi.mocked(bcrypt.compare).mockResolvedValue(false)
      
      const isInvalid = await verifyPassword('WrongPassword', hashedPassword)
      expect(isInvalid).toBe(false)
    })

    it('should validate then hash a strong password', async () => {
      const password = 'StrongP@ssw0rd'
      const hash = '$2b$12$strongPasswordHash'

      // First validate
      const validation = validatePasswordStrength(password)
      expect(validation.isValid).toBe(true)

      // Then hash if valid
      if (validation.isValid) {
        vi.mocked(bcrypt.hash).mockResolvedValue(hash)
        const hashedPassword = await hashPassword(password)
        expect(hashedPassword).toBe(hash)
      }
    })

    it('should reject weak password before hashing', async () => {
      const password = 'weak'

      // Validate first
      const validation = validatePasswordStrength(password)
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)

      // Should not hash if validation fails
      expect(bcrypt.hash).not.toHaveBeenCalled()
    })
  })
})