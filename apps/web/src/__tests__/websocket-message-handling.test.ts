import { WSAgentStatusMessage, WSMetricsMessage } from '@business-org/shared-config-ts/src/index'

describe('WebSocket Message Handling', () => {
  describe('Agent Status Messages', () => {
    it('should handle agent_status_update messages correctly', () => {
      const updateMessage: WSAgentStatusMessage = {
        type: 'agent_status_update',
        timestamp: new Date().toISOString(),
        projectId: 'test-project',
        data: {
          agentId: 'test-agent-1',
          status: {
            status: 'running',
            pid: 12345,
            startTime: new Date().toISOString(),
            resources: {
              cpu: 45.5,
              memory: 256
            },
            healthStatus: 'healthy'
          }
        }
      }

      // Verify the message structure
      expect(updateMessage.type).toBe('agent_status_update')
      expect(updateMessage.data.agentId).toBe('test-agent-1')
      expect(updateMessage.data.status?.status).toBe('running')
      expect(updateMessage.data.status?.resources).toBeDefined()
    })

    it('should handle agent_status_full messages correctly', () => {
      const fullMessage: WSAgentStatusMessage = {
        type: 'agent_status_full',
        timestamp: new Date().toISOString(),
        projectId: 'test-project',
        data: {
          agents: {
            'agent-1': {
              status: 'running',
              pid: 12345,
              startTime: new Date().toISOString(),
              healthStatus: 'healthy'
            },
            'agent-2': {
              status: 'stopped',
              stopTime: new Date().toISOString(),
              healthStatus: 'unknown'
            },
            'agent-3': {
              status: 'error',
              error: 'Connection timeout',
              healthStatus: 'unhealthy'
            }
          }
        }
      }

      // Verify the message structure
      expect(fullMessage.type).toBe('agent_status_full')
      expect(fullMessage.data.agents).toBeDefined()
      expect(Object.keys(fullMessage.data.agents!).length).toBe(3)
      
      // Verify individual agent statuses
      const agents = fullMessage.data.agents!
      expect(agents['agent-1']?.status).toBe('running')
      expect(agents['agent-2']?.status).toBe('stopped')
      expect(agents['agent-3']?.status).toBe('error')
    })

    it('should calculate activity metrics from agent_status_full message', () => {
      const fullMessage: WSAgentStatusMessage = {
        type: 'agent_status_full',
        timestamp: new Date().toISOString(),
        data: {
          agents: {
            'agent-1': { status: 'running' },
            'agent-2': { status: 'running' },
            'agent-3': { status: 'stopped' },
            'agent-4': { status: 'error' },
            'agent-5': { status: 'starting' }
          }
        }
      }

      // Calculate metrics as done in use-project-websocket.ts
      const agentStatuses = Object.values(fullMessage.data.agents!)
      const activeAgents = agentStatuses.filter(s => s.status === 'running').length
      const activity = {
        activeAgents,
        totalTasks: agentStatuses.length,
        completedTasks: 0
      }

      expect(activity.activeAgents).toBe(2) // Only 'running' agents
      expect(activity.totalTasks).toBe(5) // Total number of agents
    })
  })

  describe('Metrics Messages', () => {
    it('should handle metrics messages with data property', () => {
      const metricsMessage: WSMetricsMessage = {
        type: 'metrics',
        timestamp: new Date().toISOString(),
        data: {
          cpu: 75.5,
          memory: 1024,
          disk: 80,
          network: {
            rx: 1000,
            tx: 500
          },
          processes: 150,
          uptime: 86400
        }
      }

      // Verify the message structure
      expect(metricsMessage.type).toBe('metrics')
      expect(metricsMessage.data.cpu).toBe(75.5)
      expect(metricsMessage.data.memory).toBe(1024)
      expect(metricsMessage.data.network?.rx).toBe(1000)
    })
  })

  describe('Message Type Compatibility', () => {
    it('should handle messages that conform to WSMessage interface', () => {
      const messages: WSAgentStatusMessage[] = [
        {
          type: 'agent_status_update',
          timestamp: new Date().toISOString(),
          data: { agentId: 'test' }
        },
        {
          type: 'agent_status_full',
          timestamp: new Date().toISOString(),
          projectId: 'optional-project',
          data: { agents: {} }
        }
      ]

      messages.forEach(msg => {
        expect(msg.type).toBeDefined()
        expect(msg.timestamp).toBeDefined()
        expect(msg.data).toBeDefined()
      })
    })
  })
})