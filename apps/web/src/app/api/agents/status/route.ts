import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/security/auth-middleware'
import { withRateLimit } from '@/lib/security/rate-limit'

async function getAgentStatusHandler(request: NextRequest, authContext: AuthContext) {
  try {
    const useRealData = process.env.NEXT_PUBLIC_USE_REAL_DATA === 'true'
    const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_SERVER_URL || 'http://localhost:8080'

    if (useRealData) {
      try {
        // Fetch real agent status from bridge server
        const response = await fetch(`${bridgeUrl}/api/agents/status`)

        if (response.ok) {
          const data = await response.json()
          return NextResponse.json(data)
        }
      } catch (error) {
        console.error('Failed to fetch from bridge server:', error)
        // Fall through to mock data
      }
    }

    // Mock data fallback
    const mockAgents = [
      {
        id: 'orchestrator-001',
        name: 'Test Orchestrator',
        type: 'orchestrator',
        status: 'idle',
        canStart: true,
        canStop: false,
        canPause: true,
      },
      {
        id: 'guardian-001',
        name: 'Test Guardian',
        type: 'test-guardian',
        status: 'running',
        canStart: false,
        canStop: true,
        canPause: false,
      },
      {
        id: 'analyzer-001',
        name: 'Failure Analyzer',
        type: 'analyzer',
        status: 'idle',
        canStart: true,
        canStop: false,
        canPause: false,
      },
    ]

    const agents = mockAgents.map((agent) => ({
      ...agent,
      status: Math.random() > 0.7 ? 'running' : agent.status,
      lastCommand: {
        type: 'start' as const,
        timestamp: new Date(Date.now() - Math.random() * 3600000),
        source: 'cli' as const,
        result: 'success' as const,
      },
    }))

    return NextResponse.json({
      agents,
      isRealData: false,
      source: 'mock',
    })
  } catch (error) {
    console.error('Error fetching agent status:', error)
    return NextResponse.json({ error: 'Failed to fetch agent status' }, { status: 500 })
  }
}

// Export with authentication and rate limiting
const authenticatedHandler = withAuth(getAgentStatusHandler)
export const GET = withRateLimit(authenticatedHandler)
