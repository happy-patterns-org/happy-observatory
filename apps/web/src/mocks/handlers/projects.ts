import { http, HttpResponse } from 'msw'

const mockProjects = [
  {
    id: 'proj-123',
    name: 'Test Project',
    path: '/home/user/test-project',
    type: 'git',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'proj-456',
    name: 'Another Project',
    path: '/home/user/another-project',
    type: 'npm',
    status: 'active',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
]

export const projectHandlers = [
  // List projects
  http.get('/api/projects', () => {
    return HttpResponse.json({
      projects: mockProjects
    })
  }),

  // Get single project
  http.get('/api/projects/:projectId', ({ params }) => {
    const { projectId } = params
    const project = mockProjects.find(p => p.id === projectId)
    
    if (project) {
      return HttpResponse.json({ project })
    }
    
    return HttpResponse.json({
      error: 'Project not found'
    }, { status: 404 })
  }),

  // Create project
  http.post('/api/projects', async ({ request }) => {
    const body = await request.json() as { name: string; path: string; type: string }
    
    const newProject = {
      id: `proj-${Date.now()}`,
      ...body,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    mockProjects.push(newProject)
    
    return HttpResponse.json({
      project: newProject
    }, { status: 201 })
  }),

  // Scan for projects
  http.post('/api/projects/scan', async ({ request }) => {
    const body = await request.json() as { path: string }
    
    return HttpResponse.json({
      projects: [
        {
          name: 'Scanned Project',
          path: `${body.path}/scanned-project`,
          type: 'git',
        }
      ]
    })
  }),

  // Check submodules
  http.post('/api/projects/check-submodules', async ({ request }) => {
    const body = await request.json() as { projectId: string }
    
    return HttpResponse.json({
      hasSubmodules: false,
      submodules: []
    })
  }),

  // Check scopecam
  http.post('/api/projects/check-scopecam', async ({ request }) => {
    const body = await request.json() as { projectPath: string }
    
    return HttpResponse.json({
      hasScopecam: false,
      configPath: null
    })
  }),
]