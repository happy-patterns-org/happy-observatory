import { http, HttpResponse } from 'msw'

const mockAgents = [
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

export const agentHandlers = [
  // Get agent status
  http.get('/api/agents/status', () => {
    return HttpResponse.json({ agents: mockAgents })
  }),

  // Get project agent status
  http.get('/api/projects/:projectId/agents/status', ({ params }) => {
    const { projectId } = params
    
    // Return just the first agent for project-specific requests
    return HttpResponse.json({
      agents: [mockAgents[0]],
    })
  }),

  // Send agent command
  http.post('/api/agents/command', async ({ request }) => {
    const body = await request.json() as { agentId: string; command: string; args?: any }
    
    return HttpResponse.json({
      success: true,
      agentId: body.agentId,
      command: body.command,
      result: {
        output: 'Command executed successfully',
        exitCode: 0,
      }
    })
  }),

  // Send project agent command
  http.post('/api/projects/:projectId/agents/command', async ({ request, params }) => {
    const { projectId } = params
    const body = await request.json() as { agentId: string; command: string; args?: any }
    
    return HttpResponse.json({
      success: true,
      projectId: projectId as string,
      agentId: body.agentId,
      command: body.command,
      result: {
        output: 'Command executed successfully',
        exitCode: 0,
      }
    })
  }),
]