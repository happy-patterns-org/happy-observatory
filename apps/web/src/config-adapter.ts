/**
 * Configuration Adapter
 * Bridges the shared configuration package with the existing Observatory codebase
 * This allows gradual migration while maintaining compatibility
 */

import {
  API_PATHS,
  WS_PATHS,
  getBridgeAPIUrl,
  getBridgeWSUrl,
  WSMessage,
  WSMetricsMessage,
  WSAgentStatusMessage,
  WSContextMessage,
  AgentStatus,
  MCPContext,
} from '@business-org/shared-config-ts/src/index'
import { envConfig } from '@/lib/config/environment'

// Define types locally until they're exported from shared config
export type ProjectStatus = 'active' | 'inactive' | 'error'
export type ServiceHealth = 'healthy' | 'degraded' | 'unhealthy'

// Re-export WebSocket types from shared config
export type {
  WSMessage,
  WSMetricsMessage,
  WSAgentStatusMessage,
  WSContextMessage,
  AgentStatus,
  MCPContext,
}

// Adapter configuration that maintains compatibility with existing code
const config = {
  // API and server endpoints
  apiBaseUrl: envConfig.apiBaseUrl,
  mcpServerUrl: envConfig.bridgeApiUrl,
  mcpWebsocketUrl: envConfig.bridgeUrl,
  bridgeServerUrl: envConfig.bridgeApiUrl,
  bridgeWebsocketUrl: envConfig.bridgeUrl,
  nexusConsoleUrl: 'http://localhost:3001', // TODO: Add to environment config
  mcpDaemonUrl: envConfig.mcpDaemonUrl,
  observatoryTestServerUrl: envConfig.bridgeApiUrl,

  // Feature flags
  useRealData: !envConfig.mockData,

  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
}

// Export existing URL builder functions using shared config
export function getWebSocketUrl(httpUrl: string): string {
  return httpUrl.replace(/^http/, 'ws')
}

export function getProjectWebSocketUrl(projectId: string): string {
  return getBridgeWSUrl(projectId)
}

export function getMCPWebSocketUrl(projectId = 'devkit'): string {
  // The bridge server only knows about 'devkit' project
  return getBridgeWSUrl(projectId)
}

// Create compatibility mapping for old API path names
const API_PATHS_COMPAT = {
  ...API_PATHS,
  // Map old lowercase names to new uppercase ones
  projects: API_PATHS.PROJECTS,
  agentStatus: (projectId: string) => `/api/projects/${projectId}/agents/status`,
  agentCommand: (projectId: string) => `/api/projects/${projectId}/agents/command`,
  consoleExecute: (projectId: string) => `/api/projects/${projectId}/console/execute`,
  telemetryMetrics: (projectId: string) => `/api/projects/${projectId}/telemetry/metrics`,
  mcpContext: API_PATHS.MCP_CONTEXTS,
  metrics: API_PATHS.METRICS,
} as const

// Re-export API paths with compatibility layer
export { API_PATHS_COMPAT as API_PATHS, WS_PATHS, getBridgeAPIUrl, getBridgeWSUrl }

export default config
