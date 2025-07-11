import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'

/**
 * Utility to override handlers for specific tests
 */
export function mockApi(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  response: any,
  status = 200,
  options?: {
    headers?: Record<string, string>
    delay?: number
  }
) {
  const handler = http[method](path, async () => {
    if (options?.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay))
    }

    return HttpResponse.json(response, {
      status,
      headers: options?.headers,
    })
  })

  server.use(handler)
}

/**
 * Mock an API error response
 */
export function mockApiError(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  error: string | { error: string; details?: any },
  status = 500
) {
  const errorResponse = typeof error === 'string' ? { error } : error
  
  server.use(
    http[method](path, () => {
      return HttpResponse.json(errorResponse, { status })
    })
  )
}

/**
 * Mock network error
 */
export function mockNetworkError(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string
) {
  server.use(
    http[method](path, () => {
      return HttpResponse.error()
    })
  )
}

/**
 * Wait for MSW to handle requests
 */
export async function waitForRequest(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  url: string
): Promise<Request> {
  return new Promise((resolve) => {
    server.events.on('request:match', (data: any) => {
      const { request } = data
      if (request.method.toLowerCase() === method && request.url.includes(url)) {
        resolve(request)
      }
    })
  })
}

/**
 * Assert request was made with specific body
 */
export async function expectRequestBody(
  request: Request,
  expectedBody: Record<string, any>
) {
  const body = await request.json()
  expect(body).toEqual(expectedBody)
}

/**
 * Assert request was made with specific headers
 */
export function expectRequestHeaders(
  request: Request,
  expectedHeaders: Record<string, string>
) {
  Object.entries(expectedHeaders).forEach(([key, value]) => {
    expect(request.headers.get(key)).toBe(value)
  })
}