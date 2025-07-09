import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const useRealData = process.env.NEXT_PUBLIC_USE_REAL_DATA === 'true'
    const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_SERVER_URL || 'http://localhost:8080'

    const body = await request.json()
    const { command, projectPath } = body

    if (!command) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 })
    }

    if (useRealData) {
      try {
        // Execute command via bridge server
        const response = await fetch(`${bridgeUrl}/api/console/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ command, cwd: projectPath }),
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
        console.error('Failed to execute via bridge server:', error)
        // Fall through to mock execution
      }
    }

    // Mock command execution
    let output = ''
    let status = 'success'

    // Simulate some basic commands
    if (command === 'help') {
      output = `Happy DevKit Console Commands:
  status    - Show system status
  agents    - List active agents
  test      - Run tests
  git       - Git operations
  clear     - Clear console
  help      - Show this help`
    } else if (command === 'status') {
      output = `System Status:
  Agents: 3 active
  Tasks: 42 completed
  Uptime: 24h 13m
  Memory: 64% used`
    } else if (command === 'agents') {
      output = `Active Agents:
  1. Test Orchestrator (idle)
  2. Code Analyzer (running)
  3. Performance Monitor (running)`
    } else if (command.startsWith('git')) {
      output = `Executing: ${command}
  [Mock] Command would be executed in project directory`
    } else if (command === 'clear') {
      output = ''
    } else {
      output = `[Mock] Command not recognized: ${command}
Type 'help' for available commands`
      status = 'error'
    }

    return NextResponse.json({
      command,
      output,
      status,
      timestamp: new Date().toISOString(),
      isRealData: false,
      source: 'mock',
    })
  } catch (error) {
    console.error('Error executing command:', error)
    return NextResponse.json({ error: 'Failed to execute command' }, { status: 500 })
  }
}
