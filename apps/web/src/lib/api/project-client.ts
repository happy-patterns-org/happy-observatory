import { logger } from '@/lib/logger-client'

export interface ProjectApiOptions {
  projectId: string
  signal?: AbortSignal
}

/**
 * Client-side helper for making project-scoped API requests
 */
export class ProjectApiClient {
  private projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `/api/projects/${this.projectId}${path}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(error.error || `API request failed: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      logger.error(`Project API request failed: ${path}`, error as Error, {
        projectId: this.projectId,
        path,
      })
      throw error
    }
  }

  // Agent methods
  async executeAgentCommand(agentId: string, command: string, parameters?: any) {
    return this.request('/agents/command', {
      method: 'POST',
      body: JSON.stringify({
        agentId,
        command,
        parameters,
        source: 'dashboard',
      }),
    })
  }

  async getAgentStatus(agentId?: string) {
    const query = agentId ? `?agentId=${agentId}` : ''
    return this.request(`/agents/status${query}`)
  }

  // Telemetry methods
  async getTelemetryMetrics(timeRange = '1h', type = 'all') {
    return this.request(`/telemetry/metrics?timeRange=${timeRange}&type=${type}`)
  }

  // Console methods
  async executeConsoleCommand(command: string, cwd?: string, env?: Record<string, string>) {
    return this.request('/console/execute', {
      method: 'POST',
      body: JSON.stringify({
        command,
        cwd,
        env,
      }),
    })
  }
}

/**
 * Hook-friendly factory for creating project API clients
 */
export function useProjectApi(projectId: string | null | undefined) {
  if (!projectId) {
    return null
  }

  return new ProjectApiClient(projectId)
}
