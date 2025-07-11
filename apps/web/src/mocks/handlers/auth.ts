import { http, HttpResponse } from 'msw'

export const authHandlers = [
  // Login handler
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { username: string; password: string }
    
    // Mock successful login
    if (body.username === 'testuser' && body.password === 'testpass') {
      return HttpResponse.json({
        success: true,
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
        }
      }, {
        status: 200,
        headers: {
          'Set-Cookie': 'auth-token=mock-jwt-token; Path=/; HttpOnly; Secure; SameSite=Strict',
        }
      })
    }

    // Mock failed login
    return HttpResponse.json({
      success: false,
      error: 'Invalid credentials'
    }, { status: 401 })
  }),

  // Logout handler
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({
      success: true
    }, {
      status: 200,
      headers: {
        'Set-Cookie': 'auth-token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
      }
    })
  }),

  // Check auth handler
  http.get('/api/auth/check', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const cookie = request.headers.get('Cookie')
    
    if (authHeader?.includes('Bearer mock-jwt-token') || cookie?.includes('auth-token=mock-jwt-token')) {
      return HttpResponse.json({
        authenticated: true,
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
        }
      })
    }

    return HttpResponse.json({
      authenticated: false
    }, { status: 401 })
  }),
]