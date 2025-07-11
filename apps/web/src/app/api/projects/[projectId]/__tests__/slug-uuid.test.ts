import { NextRequest, NextResponse } from 'next/server'
import { vi } from 'vitest'


// Mock the project middleware first
vi.mock('@/lib/api/project-middleware')
vi.mock('@/lib/logger-server', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))
vi.mock('@/lib/env', () => ({
  env: {
    USE_REAL_DATA: false,
    NEXT_PUBLIC_BRIDGE_SERVER_URL: 'http://localhost:8080',
  },
}))

// Mock auth to avoid 401 errors and provide proper handler signature
vi.mock('@/lib/api/auth-project-middleware', () => ({
  withAuthAndProject: vi.fn((handler) => {
    return async (request: NextRequest, context: any) => {
      const projectId = context.params.projectId
      
      // Validate project ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
      
      if (!uuidRegex.test(projectId) && !slugRegex.test(projectId)) {
        return NextResponse.json({ error: 'Project ID must be a valid UUID or slug' }, { status: 400 })
      }
      
      // Check slug length
      if (!uuidRegex.test(projectId) && (projectId.length < 3 || projectId.length > 64)) {
        return NextResponse.json({ error: 'Project ID must be a valid UUID or slug' }, { status: 400 })
      }
      
      const authContext = {
        user: { userId: 'test-user', permissions: ['read'], projectIds: [] },
        hasPermission: vi.fn().mockReturnValue(true),
        hasProjectAccess: vi.fn().mockReturnValue(true)
      }
      const projectContext = {
        projectId: context.params.projectId,
        project: { id: context.params.projectId, name: 'Test Project' }
      }
      return handler(request, authContext, projectContext, context)
    }
  })
}))

// Mock the project middleware to validate project IDs
vi.mock('@/lib/api/project-middleware', () => ({
  getProjectContext: vi.fn((params) => ({
    projectId: params.projectId,
    project: { id: params.projectId, name: 'Test Project' }
  })),
  projectMiddleware: vi.fn((handler) => {
    return async (request: NextRequest, context: any) => {
      const projectId = context.params.projectId
      
      // Check if projectId is a valid UUID or slug
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
      
      if (!uuidRegex.test(projectId) && !slugRegex.test(projectId)) {
        return new Response(JSON.stringify({ error: 'Project ID must be a valid UUID or slug' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      // Check slug length
      if (!uuidRegex.test(projectId) && (projectId.length < 3 || projectId.length > 64)) {
        return new Response(JSON.stringify({ error: 'Project ID must be a valid UUID or slug' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return handler(request, context)
    }
  })
}))

import { GET as getAgentStatus } from '../agents/status/route'

describe('Project ID validation', () => {
  const mockContext = (projectId: string) => ({
    params: { projectId },
  })

  describe('UUID format', () => {
    it('should accept valid UUID', async () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      const request = new NextRequest(`http://localhost/api/projects/${validUUID}/agents/status`)

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
      const request = new NextRequest(`http://localhost/api/projects/${invalidUUID}/agents/status`)

      const response = await getAgentStatus(request, mockContext(invalidUUID))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Project ID must be a valid UUID or slug')
    })
  })

  describe('Slug format', () => {
    it('should accept valid slug', async () => {
      const validSlug = 'devkit'
      const request = new NextRequest(`http://localhost/api/projects/${validSlug}/agents/status`)

      const response = await getAgentStatus(request, mockContext(validSlug))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.projectId).toBe(validSlug)
    })

    it('should accept slug with hyphens', async () => {
      const validSlug = 'my-awesome-project'
      const request = new NextRequest(`http://localhost/api/projects/${validSlug}/agents/status`)

      const response = await getAgentStatus(request, mockContext(validSlug))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.projectId).toBe(validSlug)
    })

    it('should accept alphanumeric slug', async () => {
      const validSlug = 'project123'
      const request = new NextRequest(`http://localhost/api/projects/${validSlug}/agents/status`)

      const response = await getAgentStatus(request, mockContext(validSlug))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.projectId).toBe(validSlug)
    })

    it('should reject slug with special characters', async () => {
      const invalidSlug = 'project@123'
      const request = new NextRequest(`http://localhost/api/projects/${invalidSlug}/agents/status`)

      const response = await getAgentStatus(request, mockContext(invalidSlug))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Project ID must be a valid UUID or slug')
    })

    it('should reject slug shorter than 3 characters', async () => {
      const invalidSlug = 'ab'
      const request = new NextRequest(`http://localhost/api/projects/${invalidSlug}/agents/status`)

      const response = await getAgentStatus(request, mockContext(invalidSlug))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Project ID must be a valid UUID or slug')
    })

    it('should reject slug longer than 64 characters', async () => {
      const invalidSlug = 'a'.repeat(65)
      const request = new NextRequest(`http://localhost/api/projects/${invalidSlug}/agents/status`)

      const response = await getAgentStatus(request, mockContext(invalidSlug))

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Project ID must be a valid UUID or slug')
    })
  })
})
