import { API_PATHS, getBridgeAPIUrl, type MCPContext } from '@/config-adapter'
import { type AuthContext, withAuth } from '@/lib/security/auth-middleware'
import { withRateLimit } from '@/lib/security/rate-limit'
import { type NextRequest, NextResponse } from 'next/server'

async function getMCPContextHandler(_request: NextRequest, _authContext: AuthContext) {
  try {
    // MCP context is served by Bridge server
    const response = await fetch(getBridgeAPIUrl(API_PATHS.mcpContext))
    
    if (!response.ok) {
      throw new Error(`Bridge server error: ${response.statusText}`)
    }
    
    const data: MCPContext = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch MCP context:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MCP context' },
      { status: 500 }
    )
  }
}

// Export with authentication and rate limiting
const authenticatedHandler = withAuth(getMCPContextHandler)
export const GET = withRateLimit(authenticatedHandler)