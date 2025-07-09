import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { projectPath } = await request.json()

    if (!projectPath) {
      return NextResponse.json({ error: 'Project path is required' }, { status: 400 })
    }

    // Expand ~ to home directory
    const expandedPath = projectPath.replace(/^~/, process.env.HOME || '')

    // Check for ScopeCam indicators
    const scopeCamIndicators = [
      '.scopecam',
      'scopecam.config.json',
      'scopecam.yaml',
      '.scopecam.yaml',
      'test-guardian.config.json',
    ]

    let isScopeCam = false
    let scopeCamConfig = null

    // Check for ScopeCam configuration files
    for (const indicator of scopeCamIndicators) {
      try {
        const indicatorPath = path.join(expandedPath, indicator)
        const stats = await fs.stat(indicatorPath)

        if (stats.isFile() || stats.isDirectory()) {
          isScopeCam = true

          // Try to read config if it's a JSON file
          if (indicator.endsWith('.json')) {
            try {
              const content = await fs.readFile(indicatorPath, 'utf-8')
              scopeCamConfig = JSON.parse(content)
            } catch (error) {
              // Ignore parse errors
            }
          }
          break
        }
      } catch (error) {
        // File doesn't exist, continue checking
      }
    }

    // Also check package.json for scopecam dependencies
    if (!isScopeCam) {
      try {
        const packageJsonPath = path.join(expandedPath, 'package.json')
        const packageContent = await fs.readFile(packageJsonPath, 'utf-8')
        const packageJson = JSON.parse(packageContent)

        const scopeCamPackages = ['@scopecam/cli', '@scopecam/core', 'scopecam', 'scopecam-test']

        const hasScopeCamDep = scopeCamPackages.some(
          (pkg) => packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]
        )

        if (hasScopeCamDep) {
          isScopeCam = true
        }
      } catch (error) {
        // No package.json or parse error
      }
    }

    // Check for test configuration that indicates ScopeCam usage
    if (!isScopeCam) {
      try {
        const testConfigPaths = [
          'jest.config.js',
          'jest.config.ts',
          'vitest.config.js',
          'vitest.config.ts',
        ]

        for (const configFile of testConfigPaths) {
          try {
            const configPath = path.join(expandedPath, configFile)
            const content = await fs.readFile(configPath, 'utf-8')

            if (content.includes('scopecam') || content.includes('test-guardian')) {
              isScopeCam = true
              break
            }
          } catch (error) {
            // Continue checking other files
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }

    return NextResponse.json({
      isScopeCam,
      config: scopeCamConfig,
      features: isScopeCam
        ? {
            testGuardian: scopeCamConfig?.testGuardian?.enabled ?? true,
            telemetry: scopeCamConfig?.telemetry?.enabled ?? true,
            mcpTools: scopeCamConfig?.mcp?.tools ?? true,
            shellCommands: scopeCamConfig?.cli?.enabled ?? true,
          }
        : null,
    })
  } catch (error) {
    console.error('Error checking ScopeCam project:', error)
    return NextResponse.json({ error: 'Failed to check ScopeCam project' }, { status: 500 })
  }
}
