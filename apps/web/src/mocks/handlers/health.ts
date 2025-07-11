import { http, HttpResponse } from 'msw'

export const healthHandlers = [
  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      diagnostics: {
        database: 'connected',
        cache: 'connected',
        external_services: 'healthy',
      }
    })
  }),

  // IP check
  http.get('/api/ip', ({ request }) => {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfIp = request.headers.get('cf-connecting-ip')
    
    return HttpResponse.json({
      ip: forwardedFor || realIp || cfIp || '127.0.0.1',
      headers: {
        'x-forwarded-for': forwardedFor,
        'x-real-ip': realIp,
        'cf-connecting-ip': cfIp,
      }
    })
  }),
]