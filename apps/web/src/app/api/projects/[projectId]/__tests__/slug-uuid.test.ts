import { NextRequest } from 'next/server'

// Mock the project middleware first
jest.mock('@/lib/api/project-middleware')
jest.mock('@/lib/logger-server', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))
jest.mock('@/lib/env', () => ({
  env: {
    USE_REAL_DATA: false,
    NEXT_PUBLIC_BRIDGE_SERVER_URL: 'http://localhost:8080',
  },
}))

import { GET as getAgentStatus } from '../agents/status/route'

describe('Project ID validation', () => {
  const mockContext = (projectId: string) => ({
    params: { projectId },
  })

  describe('UUID format', () => {
    it('should accept valid UUID', async () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      const request = new NextRequest(
        'http://localhost/api/projects/' + validUUID + '/agents/status'
      )

      const response = await getAgentStatus(request, mockContext(validUUID))

      // Debug: check what we got
      if (response.status !== 200) {
        const errorData = await response.json()
        console.error('Response error:', errorData)
      }

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.projectId).toBe(validUUID)
    })

    it('should reject invalid UUID', async () => {
      const invalidUUID = '123-invalid-uuid!' // Add invalid character
      const request = new NextRequest(
        'http://localhost/api/projects/' + invalidUUID + '/agents/status'
      )

      const response = await getAgentStatus(request, mockContext(invalidUUID))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Project ID must be a valid UUID or slug')
    })
  })

  describe('Slug format', () => {
    it('should accept valid slug', async () => {
      const validSlug = 'devkit'
      const request = new NextRequest(
        'http://localhost/api/projects/' + validSlug + '/agents/status'
      )

      const response = await getAgentStatus(request, mockContext(validSlug))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.projectId).toBe(validSlug)
    })

    it('should accept slug with hyphens', async () => {
      const validSlug = 'my-awesome-project'
      const request = new NextRequest(
        'http://localhost/api/projects/' + validSlug + '/agents/status'
      )

      const response = await getAgentStatus(request, mockContext(validSlug))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.projectId).toBe(validSlug)
    })

    it('should accept alphanumeric slug', async () => {
      const validSlug = 'project123'
      const request = new NextRequest(
        'http://localhost/api/projects/' + validSlug + '/agents/status'
      )

      const response = await getAgentStatus(request, mockContext(validSlug))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.projectId).toBe(validSlug)
    })

    it('should reject slug with special characters', async () => {
      const invalidSlug = 'project@123'
      const request = new NextRequest(
        'http://localhost/api/projects/' + invalidSlug + '/agents/status'
      )

      const response = await getAgentStatus(request, mockContext(invalidSlug))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Project ID must be a valid UUID or slug')
    })

    it('should reject slug shorter than 3 characters', async () => {
      const invalidSlug = 'ab'
      const request = new NextRequest(
        'http://localhost/api/projects/' + invalidSlug + '/agents/status'
      )

      const response = await getAgentStatus(request, mockContext(invalidSlug))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Project ID must be a valid UUID or slug')
    })

    it('should reject slug longer than 64 characters', async () => {
      const invalidSlug = 'a'.repeat(65)
      const request = new NextRequest(
        'http://localhost/api/projects/' + invalidSlug + '/agents/status'
      )

      const response = await getAgentStatus(request, mockContext(invalidSlug))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Project ID must be a valid UUID or slug')
    })
  })
})
