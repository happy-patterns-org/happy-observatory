import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { projectPath } = await request.json()

    if (!projectPath) {
      return NextResponse.json({ error: 'Project path is required' }, { status: 400 })
    }

    // Expand ~ to home directory
    const expandedPath = projectPath.replace(/^~/, process.env.HOME || '')

    // Check if .gitmodules file exists
    const gitmodulesPath = path.join(expandedPath, '.gitmodules')

    try {
      const gitmodulesContent = await fs.readFile(gitmodulesPath, 'utf-8')

      // Parse .gitmodules for MCP-related submodules
      const hasMCPSubmodule =
        gitmodulesContent.includes('mcp') ||
        gitmodulesContent.includes('devkit') ||
        gitmodulesContent.includes('agent-server')

      // Try to detect MCP server URL from submodule config
      let mcpServerUrl = undefined

      if (hasMCPSubmodule) {
        // Check common MCP config locations
        const configPaths = [
          path.join(expandedPath, '.mcp', 'config.json'),
          path.join(expandedPath, 'mcp.config.json'),
          path.join(expandedPath, '.happy-devkit', 'config.json'),
        ]

        for (const configPath of configPaths) {
          try {
            const configContent = await fs.readFile(configPath, 'utf-8')
            const config = JSON.parse(configContent)
            if (config.serverUrl || config.server?.url) {
              mcpServerUrl = config.serverUrl || config.server.url
              break
            }
          } catch (error) {
            // Continue checking other paths
          }
        }

        // If no config found, try to infer from git submodule status
        if (!mcpServerUrl) {
          try {
            const { stdout } = await execAsync('git submodule status', { cwd: expandedPath })
            // Default to localhost with common port if submodule exists
            if (stdout.includes('mcp') || stdout.includes('devkit')) {
              mcpServerUrl = 'http://localhost:5173'
            }
          } catch (error) {
            console.error('Error checking git submodules:', error)
          }
        }
      }

      return NextResponse.json({
        hasMCPSubmodule,
        mcpServerUrl,
      })
    } catch (error) {
      // No .gitmodules file or error reading it
      return NextResponse.json({
        hasMCPSubmodule: false,
        mcpServerUrl: undefined,
      })
    }
  } catch (error) {
    console.error('Error in check-submodules:', error)
    return NextResponse.json({ error: 'Failed to check submodules' }, { status: 500 })
  }
}
