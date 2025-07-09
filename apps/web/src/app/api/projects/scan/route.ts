import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const useRealData = process.env.NEXT_PUBLIC_USE_REAL_DATA === 'true'
    const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_SERVER_URL || 'http://localhost:8080'

    const body = await request.json()
    const { path } = body

    if (useRealData) {
      try {
        // Request file system scan from bridge server
        const response = await fetch(`${bridgeUrl}/api/projects/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path }),
        })

        if (response.ok) {
          const data = await response.json()
          return NextResponse.json({
            ...data,
            isRealData: true,
            source: 'bridge',
          })
        }
      } catch (error) {
        console.error('Failed to scan via bridge server:', error)
        // Fall through to mock data
      }
    }

    // Mock project scan data
    const mockProjects = [
      {
        name: 'happy-devkit',
        path: `${path}/happy-devkit`,
        type: 'npm',
        hasGit: true,
        hasPackageJson: true,
        hasMCP: true,
        description: 'Main Happy DevKit with MCP server',
      },
      {
        name: 'scopecam',
        path: `${path}/scopecam`,
        type: 'npm',
        hasGit: true,
        hasPackageJson: true,
        hasMCP: true,
        description: 'Intelligent test orchestration',
      },
      {
        name: 'claude-code',
        path: `${path}/claude-code`,
        type: 'npm',
        hasGit: true,
        hasPackageJson: true,
        hasMCP: false,
        description: 'Claude Code CLI',
      },
    ]

    return NextResponse.json({
      projects: mockProjects,
      isRealData: false,
      source: 'mock',
      scannedPath: path,
    })
  } catch (error) {
    console.error('Error scanning projects:', error)
    return NextResponse.json({ error: 'Failed to scan projects' }, { status: 500 })
  }
}
