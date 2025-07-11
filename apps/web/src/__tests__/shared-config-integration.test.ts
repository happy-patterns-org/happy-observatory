import { API_PATHS, WSAgentStatusMessage, SERVICE_URLS, getBridgeAPIUrl, getBridgeWSUrl } from '@business-org/shared-config-ts/src/index'

describe('Shared Config Integration', () => {
  describe('API Paths', () => {
    it('should use correct API paths for projects', () => {
      const projectId = 'test-project'
      const path = API_PATHS.PROJECT_BY_ID(projectId)
      expect(path).toBe(`/api/projects/${projectId}`)
    })

    it('should use correct API paths for agents', () => {
      const projectId = 'test-project'
      const agentId = 'test-agent'
      const startPath = API_PATHS.AGENT_START(projectId, agentId)
      expect(startPath).toBe(`/api/projects/${projectId}/agents/${agentId}/start`)
    })

    it('should have correct MCP paths', () => {
      expect(API_PATHS.MCP_STATUS).toBe('/api/mcp/status')
      expect(API_PATHS.MCP_CONTEXTS).toBe('/api/mcp/contexts')
    })

    it('should have correct system paths', () => {
      expect(API_PATHS.HEALTH).toBe('/api/health')
      expect(API_PATHS.METRICS).toBe('/api/metrics')
      expect(API_PATHS.BRIDGE_STATUS).toBe('/api/bridge/status')
    })
  })

  describe('WebSocket Messages', () => {
    it('should handle WSAgentStatusMessage with data property', () => {
      const message: WSAgentStatusMessage = {
        type: 'agent_status_update',
        timestamp: new Date().toISOString(),
        data: {
          agentId: 'test-agent',
          status: { 
            status: 'running',
            pid: 1234,
            startTime: new Date().toISOString()
          }
        }
      }
      
      // Verify the message structure works with the data property
      expect(message.data.agentId).toBe('test-agent')
      expect(message.data.status?.status).toBe('running')
      expect(message.data.status?.pid).toBe(1234)
    })

    it('should handle full agent status message', () => {
      const message: WSAgentStatusMessage = {
        type: 'agent_status_full',
        timestamp: new Date().toISOString(),
        projectId: 'test-project',
        data: {
          agents: {
            'agent-1': { status: 'running' },
            'agent-2': { status: 'stopped' }
          }
        }
      }

      expect(message.type).toBe('agent_status_full')
      expect(message.data.agents).toBeDefined()
      expect(Object.keys(message.data.agents!).length).toBe(2)
    })
  })

  describe('Service URLs', () => {
    it('should have correct service URLs', () => {
      expect(SERVICE_URLS.BRIDGE_SERVER).toContain(':8080')
      expect(SERVICE_URLS.OBSERVATORY).toContain(':3000')
      expect(SERVICE_URLS.CONSOLE).toContain(':3001')
      expect(SERVICE_URLS.MCP_DAEMON).toContain(':8090')
    })
  })

  describe('URL Builder Functions', () => {
    it('should build correct Bridge API URLs', () => {
      const path = '/api/test'
      const url = getBridgeAPIUrl(path)
      expect(url).toContain(':8080')
      expect(url.endsWith(path)).toBe(true)
    })

    it('should build correct Bridge WebSocket URLs', () => {
      const path = '/ws/test'
      const url = getBridgeWSUrl(path)
      expect(url).toMatch(/^ws:\/\//)
      expect(url).toContain(':8080')
      expect(url.endsWith(path)).toBe(true)
    })
  })

  describe('Compatibility Layer', () => {
    it('should maintain backward compatibility with old API path names', async () => {
      // Import from our adapter
      const { API_PATHS: API_PATHS_COMPAT } = await import('@/config-adapter')
      
      // These are the old lowercase names that should still work
      expect(API_PATHS_COMPAT.projects).toBe('/api/projects')
      expect(API_PATHS_COMPAT.metrics).toBe('/api/metrics')
      expect(API_PATHS_COMPAT.mcpContext).toBe('/api/mcp/contexts')
      
      // Function-based paths should also work
      const projectId = 'test-project'
      expect(API_PATHS_COMPAT.agentStatus(projectId)).toBe(`/api/projects/${projectId}/agents/status`)
      expect(API_PATHS_COMPAT.consoleExecute(projectId)).toBe(`/api/projects/${projectId}/console/execute`)
    })
  })
})