export class NextRequest {
  url: string
  method: string
  headers: Headers
  nextUrl: URL

  constructor(url: string, init?: RequestInit) {
    this.url = url
    this.method = init?.method || 'GET'
    this.headers = new Headers(init?.headers)
    this.nextUrl = new URL(url)
  }

  json() {
    return Promise.resolve({})
  }
}

export class NextResponse {
  status: number
  statusText: string
  headers: Headers
  private body: unknown

  constructor(body?: unknown, init?: ResponseInit) {
    this.body = body
    this.status = init?.status || 200
    this.statusText = init?.statusText || 'OK'
    this.headers = new Headers(init?.headers)
  }

  static json(data: unknown, init?: ResponseInit) {
    const response = new NextResponse(data, init)
    response.headers.set('content-type', 'application/json')
    return response
  }

  async json() {
    return this.body
  }
}
