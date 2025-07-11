import { describe, it, expect } from 'vitest'
import { mockApi, mockApiError, mockNetworkError } from '@/test-utils/msw'

describe('MSW Setup', () => {
  it('should handle mocked API responses', async () => {
    // Test successful response
    const response = await fetch('/api/health')
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
  })

  it('should handle custom mocked responses', async () => {
    // Override the default handler
    mockApi('get', '/api/projects', {
      projects: [
        { id: 'custom-1', name: 'Custom Project' }
      ]
    })

    const response = await fetch('/api/projects')
    const data = await response.json()
    
    expect(data.projects).toHaveLength(1)
    expect(data.projects[0].name).toBe('Custom Project')
  })

  it('should handle error responses', async () => {
    mockApiError('post', '/api/auth/login', 'Invalid credentials', 401)

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'wrong', password: 'wrong' })
    })
    const data = await response.json()
    
    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid credentials')
  })

  it('should handle network errors', async () => {
    mockNetworkError('get', '/api/network-error')

    await expect(
      fetch('/api/network-error')
    ).rejects.toThrow()
  })

  it('should handle authentication flow', async () => {
    // Test login
    const loginResponse = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser', password: 'testpass' })
    })
    
    expect(loginResponse.status).toBe(200)
    const loginData = await loginResponse.json()
    expect(loginData.success).toBe(true)
    expect(loginData.user.username).toBe('testuser')

    // Test auth check
    const checkResponse = await fetch('/api/auth/check', {
      headers: { 'Authorization': 'Bearer mock-jwt-token' }
    })
    
    expect(checkResponse.status).toBe(200)
    const checkData = await checkResponse.json()
    expect(checkData.authenticated).toBe(true)

    // Test logout
    const logoutResponse = await fetch('/api/auth/logout', {
      method: 'POST'
    })
    
    expect(logoutResponse.status).toBe(200)
    const logoutData = await logoutResponse.json()
    expect(logoutData.success).toBe(true)
  })
})