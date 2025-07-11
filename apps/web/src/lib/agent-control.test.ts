import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { agentControlManager } from './agent-control'
import type { AgentControl, AgentCommand } from './agent-control'
import { mockApi, mockApiError } from '@/test-utils/msw'

// Simple waitFor utility for non-React tests
async function waitFor(
  callback: () => void | Promise<void>,
  options = { timeout: 1000, interval: 50 }
): Promise<void> {
  const start = Date.now()
  
  while (Date.now() - start < options.timeout) {
    try {
      await callback()
      return
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, options.interval))
    }
  }
  
  // Final attempt
  await callback()
}

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock the telemetry module
vi.mock('@/lib/scopecam/telemetry', () => {
  const mockClient = {
    on: vi.fn(),
    recordEvent: vi.fn().mockResolvedValue(undefined),
  }
  return {
    getTelemetryClient: vi.fn(() => mockClient),
  }
})

describe('AgentControlManager', () => {
  // Mock window object for client-side checks
  beforeAll(() => {
    global.window = {} as any
  })

  afterAll(() => {
    delete (global as any).window
  })

  const mockAgent: AgentControl = {
    id: 'agent-1',
    name: 'Test Agent',
    type: 'mcp-tool',
    status: 'idle',
    canStart: true,
    canStop: false,
    canPause: false,
  }

  const mockAgents: AgentControl[] = [
    mockAgent,
    {
      id: 'agent-2',
      name: 'Running Agent',
      type: 'test-guardian',
      status: 'running',
      canStart: false,
      canStop: true,
      canPause: true,
    },
    {
      id: 'agent-3',
      name: 'Paused Agent',
      type: 'orchestrator',
      status: 'paused',
      canStart: false,
      canStop: true,
      canPause: false,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset the singleton state
    agentControlManager.destroy()
  })

  afterEach(() => {
    agentControlManager.destroy()
  })

  describe('Status Synchronization', () => {
    it('should fetch initial agent statuses', async () => {
      // Set up a listener
      const listener = vi.fn()
      const unsubscribe = agentControlManager.subscribe(listener)

      // Force a sync since we're in test environment
      await agentControlManager.forceSync()

      // Wait for agents to appear
      await waitFor(() => {
        const agents = agentControlManager.getAgents()
        expect(agents).toHaveLength(3)
      })

      // Check that we got the mocked agents
      const agents = agentControlManager.getAgents()
      expect(agents[0].name).toBe('Test Agent')

      unsubscribe()
    })

    it('should sync project-specific agents when project context is set', async () => {
      const projectId = 'proj-123'
      mockApi('get', `/api/projects/${projectId}/agents/status`, {
        agents: [mockAgent],
      })

      agentControlManager.setProjectContext(projectId)

      // Wait for sync
      await waitFor(() => {
        const agents = agentControlManager.getAgents()
        expect(agents).toHaveLength(1)
      })
    })

    it('should clear cache when project context changes', () => {
      // Add some agents to cache
      const listener = vi.fn()
      agentControlManager.subscribe(listener)

      // Change project context
      agentControlManager.setProjectContext('new-project')

      // Cache should be cleared
      expect(agentControlManager.getAgents()).toHaveLength(0)
    })

    it('should handle API errors gracefully', async () => {
      mockApiError('get', '/api/agents/status', 'Server error', 500)

      const listener = vi.fn()
      agentControlManager.subscribe(listener)

      // Should not throw
      await waitFor(() => {
        // Initial call with empty array
        expect(listener).toHaveBeenCalledWith([])
      })
    })
  })

  describe('Subscribe/Unsubscribe', () => {
    it('should notify multiple listeners', async () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      const unsub1 = agentControlManager.subscribe(listener1)
      const unsub2 = agentControlManager.subscribe(listener2)

      await waitFor(() => {
        expect(listener1).toHaveBeenCalled()
        expect(listener2).toHaveBeenCalled()
      })

      unsub1()
      unsub2()
    })

    it('should stop notifying after unsubscribe', async () => {
      const listener = vi.fn()
      const unsubscribe = agentControlManager.subscribe(listener)

      await waitFor(() => {
        expect(listener).toHaveBeenCalledTimes(1)
      })

      // Unsubscribe
      unsubscribe()
      listener.mockClear()

      // Trigger a change
      agentControlManager.setProjectContext('new-project')

      // Should not be called again
      expect(listener).not.toHaveBeenCalled()
    })

    it('should send current state immediately on subscribe', () => {
      const listener = vi.fn()
      agentControlManager.subscribe(listener)

      // Should be called immediately with current state
      expect(listener).toHaveBeenCalledWith([])
    })
  })

  describe('Command Execution', () => {
    beforeEach(async () => {
      // Mock the API response with all 3 agents
      mockApi('get', '/api/agents/status', { agents: mockAgents })
      
      // Force sync before each test
      await agentControlManager.forceSync()
      // Wait for initial agent sync
      await waitFor(() => {
        expect(agentControlManager.getAgents()).toHaveLength(3)
      })
    })

    it('should execute start command successfully', async () => {
      mockApi('post', '/api/agents/command', { success: true })

      const command: AgentCommand = {
        agentId: 'agent-1',
        command: 'start',
        source: 'dashboard',
      }

      const result = await agentControlManager.executeCommand(command)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()

      // Check agent status was updated
      const agent = agentControlManager.getAgent('agent-1')
      expect(agent?.status).toBe('running')
      expect(agent?.lastCommand).toMatchObject({
        type: 'start',
        source: 'dashboard',
        result: 'success',
      })
    })

    it('should execute stop command successfully', async () => {
      mockApi('post', '/api/agents/command', { success: true })

      const command: AgentCommand = {
        agentId: 'agent-2',
        command: 'stop',
        source: 'dashboard',
      }

      const result = await agentControlManager.executeCommand(command)

      expect(result.success).toBe(true)

      // Check agent status was updated
      const agent = agentControlManager.getAgent('agent-2')
      expect(agent?.status).toBe('idle')
    })

    it('should execute pause command successfully', async () => {
      mockApi('post', '/api/agents/command', { success: true })

      const command: AgentCommand = {
        agentId: 'agent-2',
        command: 'pause',
        source: 'dashboard',
      }

      const result = await agentControlManager.executeCommand(command)

      expect(result.success).toBe(true)

      // Check agent status was updated
      const agent = agentControlManager.getAgent('agent-2')
      expect(agent?.status).toBe('paused')
    })

    it('should execute resume command successfully', async () => {
      mockApi('post', '/api/agents/command', { success: true })

      const command: AgentCommand = {
        agentId: 'agent-3',
        command: 'resume',
        source: 'dashboard',
      }

      const result = await agentControlManager.executeCommand(command)

      expect(result.success).toBe(true)

      // Check agent status was updated
      const agent = agentControlManager.getAgent('agent-3')
      expect(agent?.status).toBe('running')
    })

    it('should handle command execution with project context', async () => {
      const projectId = 'proj-123'
      mockApi('post', `/api/projects/${projectId}/agents/command`, { success: true })

      const command: AgentCommand = {
        agentId: 'agent-1',
        command: 'start',
        source: 'dashboard',
        projectId,
      }

      const result = await agentControlManager.executeCommand(command)

      expect(result.success).toBe(true)
    })

    it('should handle command execution failure', async () => {
      mockApiError('post', '/api/agents/command', 'Command failed', 500)

      const command: AgentCommand = {
        agentId: 'agent-1',
        command: 'start',
        source: 'dashboard',
      }

      const result = await agentControlManager.executeCommand(command)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Command failed')

      // Check lastCommand was updated with failure
      const agent = agentControlManager.getAgent('agent-1')
      expect(agent?.lastCommand?.result).toBe('failed')
    })

    it('should return error for non-existent agent', async () => {
      const command: AgentCommand = {
        agentId: 'non-existent',
        command: 'start',
        source: 'dashboard',
      }

      const result = await agentControlManager.executeCommand(command)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Agent not found')
    })
  })

  describe('Command Validation', () => {
    beforeEach(async () => {
      // Mock the API response with all 3 agents
      mockApi('get', '/api/agents/status', { agents: mockAgents })
      
      // Force sync before each test
      await agentControlManager.forceSync()
      // Wait for initial agent sync
      await waitFor(() => {
        expect(agentControlManager.getAgents()).toHaveLength(3)
      })
    })

    it('should reject start command when agent cannot start', async () => {
      const command: AgentCommand = {
        agentId: 'agent-2', // Running agent
        command: 'start',
        source: 'dashboard',
      }

      const result = await agentControlManager.executeCommand(command)

      expect(result.success).toBe(false)
      expect(result.error).toContain('already running')
    })

    it('should reject stop command when agent cannot stop', async () => {
      const command: AgentCommand = {
        agentId: 'agent-1', // Idle agent
        command: 'stop',
        source: 'dashboard',
      }

      const result = await agentControlManager.executeCommand(command)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not running')
    })

    it('should reject pause command when agent does not support pausing', async () => {
      // Create an agent that's running but can't pause
      const nonPausableAgent: AgentControl = {
        id: 'agent-4',
        name: 'Non-pausable Agent',
        type: 'analyzer',
        status: 'running',
        canStart: false,
        canStop: true,
        canPause: false,
      }

      mockApi('get', '/api/agents/status', {
        agents: [...mockAgents, nonPausableAgent],
      })

      // Force a sync
      agentControlManager.setProjectContext(null)

      await waitFor(() => {
        expect(agentControlManager.getAgents()).toHaveLength(4)
      })

      const command: AgentCommand = {
        agentId: 'agent-4',
        command: 'pause',
        source: 'dashboard',
      }

      const result = await agentControlManager.executeCommand(command)

      expect(result.success).toBe(false)
      expect(result.error).toContain('does not support pausing')
    })

    it('should reject pause command when agent is not running', async () => {
      const command: AgentCommand = {
        agentId: 'agent-1', // Idle agent
        command: 'pause',
        source: 'dashboard',
      }

      const result = await agentControlManager.executeCommand(command)

      expect(result.success).toBe(false)
      expect(result.error).toContain('must be running to pause')
    })

    it('should reject resume command when agent is not paused', async () => {
      const command: AgentCommand = {
        agentId: 'agent-1', // Idle agent
        command: 'resume',
        source: 'dashboard',
      }

      const result = await agentControlManager.executeCommand(command)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not paused')
    })
  })

  describe('Agent Queries', () => {
    beforeEach(async () => {
      // Mock the API response with all 3 agents
      mockApi('get', '/api/agents/status', { agents: mockAgents })
      
      // Force sync before each test
      await agentControlManager.forceSync()
      // Wait for initial agent sync
      await waitFor(() => {
        expect(agentControlManager.getAgents()).toHaveLength(3)
      })
    })

    it('should get all agents', () => {
      const agents = agentControlManager.getAgents()
      
      expect(agents).toHaveLength(3)
      expect(agents[0].id).toBe('agent-1')
      expect(agents[1].id).toBe('agent-2')
      expect(agents[2].id).toBe('agent-3')
    })

    it('should get specific agent by id', () => {
      const agent = agentControlManager.getAgent('agent-2')
      
      expect(agent).toBeDefined()
      expect(agent?.name).toBe('Running Agent')
      expect(agent?.status).toBe('running')
    })

    it('should return undefined for non-existent agent', () => {
      const agent = agentControlManager.getAgent('non-existent')
      
      expect(agent).toBeUndefined()
    })
  })

  describe('Real-time Updates', () => {
    it('should handle agent status change events', async () => {
      // Mock the API response with all 3 agents
      mockApi('get', '/api/agents/status', { agents: mockAgents })
      
      // Force initial sync
      await agentControlManager.forceSync()
      
      // Get the telemetry client mock
      const { getTelemetryClient } = await import('@/lib/scopecam/telemetry')
      const telemetryClient = getTelemetryClient()
      
      // Get the status change handler from the mock
      const statusChangeHandler = vi.mocked(telemetryClient.on).mock.calls.find(
        call => call[0] === 'agent-status-change'
      )?.[1]
      
      expect(statusChangeHandler).toBeDefined()

      // Wait for initial sync
      await waitFor(() => {
        expect(agentControlManager.getAgents()).toHaveLength(3)
      })

      // Simulate status change event
      statusChangeHandler({
        agentId: 'agent-1',
        status: 'running',
        lastCommand: {
          type: 'start',
          timestamp: new Date(),
          source: 'cli',
          result: 'success',
        },
      })

      // Check agent was updated
      const agent = agentControlManager.getAgent('agent-1')
      expect(agent?.status).toBe('running')
      expect(agent?.lastCommand?.source).toBe('cli')
    })
  })

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const listener = vi.fn()
      agentControlManager.subscribe(listener)
      
      // Add some agents
      mockApi('get', '/api/agents/status', { agents: mockAgents })
      
      // Destroy
      agentControlManager.destroy()
      
      // Everything should be cleared
      expect(agentControlManager.getAgents()).toHaveLength(0)
      
      // Listener should not be called after destroy
      listener.mockClear()
      agentControlManager.setProjectContext('test')
      expect(listener).not.toHaveBeenCalled()
    })
  })
})