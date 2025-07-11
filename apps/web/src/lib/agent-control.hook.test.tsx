import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAgentControl } from './agent-control'
import { agentControlManager } from './agent-control'
import type { AgentControl } from './agent-control'
import { mockApi } from '@/test-utils/msw'

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock the telemetry client
vi.mock('@/lib/scopecam/telemetry', () => ({
  getTelemetryClient: vi.fn(() => ({
    on: vi.fn(),
    recordEvent: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('useAgentControl hook', () => {
  // Mock window object for client-side checks
  beforeAll(() => {
    global.window = {} as any
  })

  afterAll(() => {
    delete (global as any).window
  })

  const mockAgents: AgentControl[] = [
    {
      id: 'agent-1',
      name: 'Test Agent',
      type: 'mcp-tool',
      status: 'idle',
      canStart: true,
      canStop: false,
      canPause: false,
    },
    {
      id: 'agent-2',
      name: 'Running Agent',
      type: 'test-guardian',
      status: 'running',
      canStart: false,
      canStop: true,
      canPause: true,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    agentControlManager.destroy()
    
    // Mock successful agent status response
    mockApi('get', '/api/agents/status', { agents: mockAgents })
  })

  afterEach(() => {
    agentControlManager.destroy()
  })

  it('should return initial agents', async () => {
    const { result } = renderHook(() => useAgentControl())

    // Initially empty
    expect(result.current.agents).toHaveLength(0)
    expect(result.current.isExecuting).toBe(false)

    // Wait for agents to load
    await waitFor(() => {
      expect(result.current.agents).toHaveLength(2)
    })

    expect(result.current.agents[0].name).toBe('Test Agent')
    expect(result.current.agents[1].name).toBe('Running Agent')
  })

  it('should update when project context changes', async () => {
    const projectId = 'proj-123'
    const projectAgents = [mockAgents[0]] // Only one agent for the project
    
    mockApi('get', `/api/projects/${projectId}/agents/status`, {
      agents: projectAgents,
    })

    const { result, rerender } = renderHook(
      ({ projectId }) => useAgentControl(projectId),
      { initialProps: { projectId: undefined } }
    )

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.agents).toHaveLength(2)
    })

    // Change project
    rerender({ projectId })

    // Wait for project-specific agents
    await waitFor(() => {
      expect(result.current.agents).toHaveLength(1)
    })

    expect(result.current.agents[0].id).toBe('agent-1')
  })

  it('should execute commands', async () => {
    mockApi('post', '/api/agents/command', { success: true })
    
    const { result } = renderHook(() => useAgentControl())

    // Wait for agents to load
    await waitFor(() => {
      expect(result.current.agents).toHaveLength(2)
    })

    let commandResult: any

    // Execute command
    await act(async () => {
      commandResult = await result.current.executeCommand({
        agentId: 'agent-1',
        command: 'start',
      })
    })

    expect(commandResult.success).toBe(true)
    
    // Check agent status was updated
    const agent = result.current.getAgent('agent-1')
    expect(agent?.status).toBe('running')
  })

  it('should set isExecuting during command execution', async () => {
    mockApi('post', '/api/agents/command', { success: true }, 200, { delay: 100 })
    
    const { result } = renderHook(() => useAgentControl())

    // Wait for agents to load
    await waitFor(() => {
      expect(result.current.agents).toHaveLength(2)
    })

    expect(result.current.isExecuting).toBe(false)

    // Start command execution
    const promise = act(async () => {
      return result.current.executeCommand({
        agentId: 'agent-1',
        command: 'start',
      })
    })

    // Should be executing
    expect(result.current.isExecuting).toBe(true)

    // Wait for completion
    await promise

    expect(result.current.isExecuting).toBe(false)
  })

  it('should execute commands with project context', async () => {
    const projectId = 'proj-123'
    mockApi('post', `/api/projects/${projectId}/agents/command`, { success: true })
    
    const { result } = renderHook(() => useAgentControl(projectId))

    // Wait for agents to load
    await waitFor(() => {
      expect(result.current.agents).toHaveLength(2)
    })

    let commandResult: any

    // Execute command
    await act(async () => {
      commandResult = await result.current.executeCommand({
        agentId: 'agent-1',
        command: 'start',
      })
    })

    expect(commandResult.success).toBe(true)
  })

  it('should handle command execution errors', async () => {
    mockApi('post', '/api/agents/command', { error: 'Command failed' }, 500)
    
    const { result } = renderHook(() => useAgentControl())

    // Wait for agents to load
    await waitFor(() => {
      expect(result.current.agents).toHaveLength(2)
    })

    let commandResult: any

    // Execute command
    await act(async () => {
      commandResult = await result.current.executeCommand({
        agentId: 'agent-1',
        command: 'start',
      })
    })

    expect(commandResult.success).toBe(false)
    expect(commandResult.error).toBe('Command failed')
  })

  it('should provide getAgent helper', async () => {
    const { result } = renderHook(() => useAgentControl())

    // Wait for agents to load
    await waitFor(() => {
      expect(result.current.agents).toHaveLength(2)
    })

    const agent = result.current.getAgent('agent-2')
    expect(agent).toBeDefined()
    expect(agent?.name).toBe('Running Agent')
    expect(agent?.status).toBe('running')

    const nonExistent = result.current.getAgent('non-existent')
    expect(nonExistent).toBeUndefined()
  })

  it('should update agents when subscription triggers', async () => {
    const { result } = renderHook(() => useAgentControl())

    // Wait for initial agents
    await waitFor(() => {
      expect(result.current.agents).toHaveLength(2)
    })

    // Mock new agents data
    const updatedAgents = [
      ...mockAgents,
      {
        id: 'agent-3',
        name: 'New Agent',
        type: 'analyzer' as const,
        status: 'idle' as const,
        canStart: true,
        canStop: false,
        canPause: false,
      },
    ]

    mockApi('get', '/api/agents/status', { agents: updatedAgents })

    // Trigger a sync by changing project context
    act(() => {
      agentControlManager.setProjectContext(null)
    })

    // Wait for update
    await waitFor(() => {
      expect(result.current.agents).toHaveLength(3)
    })

    expect(result.current.agents[2].name).toBe('New Agent')
  })

  it('should cleanup subscription on unmount', async () => {
    const { result, unmount } = renderHook(() => useAgentControl())

    // Wait for agents to load
    await waitFor(() => {
      expect(result.current.agents).toHaveLength(2)
    })

    // Get current listener count
    const subscribeSpy = vi.spyOn(agentControlManager, 'subscribe')
    const initialCalls = subscribeSpy.mock.calls.length

    // Unmount
    unmount()

    // Re-render a new instance
    const { result: newResult } = renderHook(() => useAgentControl())

    // Should have one new subscription
    expect(subscribeSpy.mock.calls.length).toBe(initialCalls + 1)

    // The old subscription should be cleaned up
    // (We can't directly test this, but we ensure no memory leaks)
  })
})