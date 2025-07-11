import { act, renderHook } from '@testing-library/react'
import { useProjectStore } from '../project-store'
import { vi } from 'vitest'

// Mock crypto.randomUUID for consistent testing
const mockRandomUUID = vi.fn()
Object.defineProperty(global.crypto, 'randomUUID', {
  writable: true,
  value: mockRandomUUID,
})

describe('Project Store', () => {
  beforeEach(() => {
    // Use fake timers
    vi.useFakeTimers()
    
    // Reset mock
    mockRandomUUID.mockReturnValue('test-uuid-123')

    // Clear store before each test
    useProjectStore.setState({
      projects: [],
      selectedProjectId: null,
      selectedProject: null,
    })
    // Clear any persisted state
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('addProject', () => {
    it('should add a new project with generated ID', () => {
      const { result } = renderHook(() => useProjectStore())

      const newProject = {
        name: 'Test Project',
        path: '/test/path',
        description: 'Test description',
      }

      act(() => {
        result.current.addProject(newProject)
      })

      expect(result.current.projects).toHaveLength(1)
      expect(result.current.projects[0]).toMatchObject({
        ...newProject,
        id: expect.any(String),
        lastAccessed: expect.any(Date),
      })
    })

    it('should add multiple projects', () => {
      const { result } = renderHook(() => useProjectStore())

      act(() => {
        result.current.addProject({ name: 'Project 1', path: '/path1' })
        result.current.addProject({ name: 'Project 2', path: '/path2' })
      })

      expect(result.current.projects).toHaveLength(2)
      expect(result.current.projects[0]?.name).toBe('Project 1')
      expect(result.current.projects[1]?.name).toBe('Project 2')
    })
  })

  describe('removeProject', () => {
    it('should remove a project by ID', () => {
      const { result } = renderHook(() => useProjectStore())

      let projectId: string

      act(() => {
        result.current.addProject({ name: 'To Remove', path: '/remove' })
      })

      // Get the project ID after the state has updated
      projectId = result.current.projects[0]?.id ?? ''

      act(() => {
        result.current.removeProject(projectId)
      })

      expect(result.current.projects).toHaveLength(0)
    })

    it('should clear selection if selected project is removed', () => {
      const { result } = renderHook(() => useProjectStore())

      let projectId: string

      act(() => {
        result.current.addProject({ name: 'Selected', path: '/selected' })
      })

      // Get the project ID after the state has updated
      projectId = result.current.projects[0]?.id ?? ''

      act(() => {
        result.current.selectProject(projectId)
      })

      expect(result.current.selectedProjectId).toBe(projectId)
      expect(result.current.selectedProject).toBeTruthy()

      act(() => {
        result.current.removeProject(projectId)
      })

      expect(result.current.selectedProjectId).toBeNull()
      expect(result.current.selectedProject).toBeNull()
    })
  })

  describe('selectProject', () => {
    it('should select a project by ID', () => {
      const { result } = renderHook(() => useProjectStore())

      let projectId: string

      act(() => {
        result.current.addProject({ name: 'To Select', path: '/select' })
      })

      // Get the project ID after the state has updated
      projectId = result.current.projects[0]?.id ?? ''

      act(() => {
        result.current.selectProject(projectId)
      })

      expect(result.current.selectedProjectId).toBe(projectId)
      expect(result.current.selectedProject?.name).toBe('To Select')
    })

    it('should update lastAccessed when selecting a project', () => {
      const { result } = renderHook(() => useProjectStore())

      let projectId: string
      let originalDate: Date

      act(() => {
        result.current.addProject({ name: 'Project', path: '/path' })
      })

      // Get the project data after the state has updated
      projectId = result.current.projects[0]?.id ?? ''
      originalDate = result.current.projects[0]?.lastAccessed ?? new Date()

      // Wait a bit to ensure date changes
      act(() => {
        vi.advanceTimersByTime(100)
        result.current.selectProject(projectId)
      })

      const updatedProject = result.current.projects.find((p) => p.id === projectId)
      expect(updatedProject?.lastAccessed).not.toBe(originalDate)
    })

    it('should clear selection when passed null', () => {
      const { result } = renderHook(() => useProjectStore())

      act(() => {
        result.current.addProject({ name: 'Project', path: '/path' })
      })

      const projectId = result.current.projects[0]?.id ?? ''

      act(() => {
        result.current.selectProject(projectId)
      })

      expect(result.current.selectedProject).toBeTruthy()

      act(() => {
        result.current.selectProject(null)
      })

      expect(result.current.selectedProjectId).toBeNull()
      expect(result.current.selectedProject).toBeNull()
    })
  })

  describe('updateProject', () => {
    it('should update project properties', () => {
      const { result } = renderHook(() => useProjectStore())

      let projectId: string

      act(() => {
        result.current.addProject({ name: 'Original', path: '/original' })
      })

      // Get the project ID after the state has updated
      projectId = result.current.projects[0]?.id ?? ''

      act(() => {
        result.current.updateProject(projectId, {
          name: 'Updated',
          hasSubmoduleMCP: true,
          mcpServerUrl: 'http://localhost:5173',
        })
      })

      const updatedProject = result.current.projects.find((p) => p.id === projectId)
      expect(updatedProject).toMatchObject({
        name: 'Updated',
        path: '/original', // Should not change
        hasSubmoduleMCP: true,
        mcpServerUrl: 'http://localhost:5173',
      })
    })

    it('should update selectedProject if it is currently selected', () => {
      const { result } = renderHook(() => useProjectStore())

      let projectId: string

      act(() => {
        result.current.addProject({ name: 'Selected', path: '/selected' })
      })

      // Get the project ID after the state has updated
      projectId = result.current.projects[0]?.id ?? ''

      act(() => {
        result.current.selectProject(projectId)
      })

      act(() => {
        result.current.updateProject(projectId, { name: 'Updated Selected' })
      })

      expect(result.current.selectedProject?.name).toBe('Updated Selected')
    })
  })

  describe('updateAgentActivity', () => {
    it('should update agent activity for a project', () => {
      const { result } = renderHook(() => useProjectStore())

      let projectId: string

      act(() => {
        result.current.addProject({ name: 'Project', path: '/path' })
      })

      // Get the project ID after the state has updated
      projectId = result.current.projects[0]?.id ?? ''

      const activity = {
        activeAgents: 3,
        totalTasks: 10,
        completedTasks: 7,
      }

      act(() => {
        result.current.updateAgentActivity(projectId, activity)
      })

      const project = result.current.projects.find((p) => p.id === projectId)
      expect(project?.agentActivity).toEqual(activity)
    })
  })

  describe('updateConnectionStatus', () => {
    it('should update connection status for a project', () => {
      const { result } = renderHook(() => useProjectStore())

      let projectId: string

      act(() => {
        result.current.addProject({ name: 'Project', path: '/path' })
      })

      projectId = result.current.projects[0]?.id ?? ''

      act(() => {
        result.current.updateConnectionStatus(projectId, {
          bridge: 'connected',
          mcp: 'connecting',
        })
      })

      const project = result.current.projects.find((p) => p.id === projectId)
      expect(project?.connectionStatus).toEqual({
        bridge: 'connected',
        mcp: 'connecting',
      })
    })

    it('should merge connection status updates', () => {
      const { result } = renderHook(() => useProjectStore())

      let projectId: string

      act(() => {
        result.current.addProject({ name: 'Project', path: '/path' })
      })

      projectId = result.current.projects[0]?.id ?? ''

      // First update
      act(() => {
        result.current.updateConnectionStatus(projectId, {
          bridge: 'connected',
        })
      })

      // Second update
      act(() => {
        result.current.updateConnectionStatus(projectId, {
          mcp: 'error',
          lastError: 'Connection failed',
        })
      })

      const project = result.current.projects.find((p) => p.id === projectId)
      expect(project?.connectionStatus).toEqual({
        bridge: 'connected',
        mcp: 'error',
        lastError: 'Connection failed',
      })
    })

    it('should handle missing project gracefully', () => {
      const { result } = renderHook(() => useProjectStore())

      // Should not throw
      act(() => {
        result.current.updateConnectionStatus('non-existent', {
          bridge: 'connected',
        })
      })

      expect(result.current.projects).toHaveLength(0)
    })
  })

  describe('setProjectUrls', () => {
    it('should set project URLs', () => {
      const { result } = renderHook(() => useProjectStore())

      let projectId: string

      act(() => {
        result.current.addProject({ name: 'Project', path: '/path' })
      })

      projectId = result.current.projects[0]?.id ?? ''

      act(() => {
        result.current.setProjectUrls(projectId, {
          bridgeUrl: 'ws://bridge:8080',
          wsUrl: 'ws://ws:9090',
          mcpServerUrl: 'http://mcp:5173',
        })
      })

      const project = result.current.projects.find((p) => p.id === projectId)
      expect(project).toMatchObject({
        bridgeUrl: 'ws://bridge:8080',
        wsUrl: 'ws://ws:9090',
        mcpServerUrl: 'http://mcp:5173',
      })
    })
  })

  describe('generateId', () => {
    it('should generate known IDs for backend projects', () => {
      const { result } = renderHook(() => useProjectStore())

      act(() => {
        result.current.addProject({ name: 'Happy DevKit', path: '/devkit' })
      })

      expect(result.current.projects[0]?.id).toBe('devkit')

      act(() => {
        result.current.addProject({ name: 'ScopeCam', path: '/scopecam' })
      })

      expect(result.current.projects[1]?.id).toBe('scopecam')
    })

    it('should generate UUID for other projects', () => {
      const { result } = renderHook(() => useProjectStore())

      act(() => {
        result.current.addProject({ name: 'Custom Project', path: '/custom' })
      })

      expect(result.current.projects[0]?.id).toBe('test-uuid-123')
    })

    it('should use fallback ID generation when crypto.randomUUID is not available', () => {
      const { result } = renderHook(() => useProjectStore())

      // Temporarily make crypto.randomUUID undefined
      const originalRandomUUID = global.crypto.randomUUID
      Object.defineProperty(global.crypto, 'randomUUID', {
        writable: true,
        value: undefined,
      })

      act(() => {
        result.current.addProject({ name: 'Fallback Project', path: '/fallback' })
      })

      const projectId = result.current.projects[0]?.id ?? ''
      expect(projectId).toMatch(/^\d+-[a-z0-9]+$/)

      // Restore original
      Object.defineProperty(global.crypto, 'randomUUID', {
        writable: true,
        value: originalRandomUUID,
      })
    })
  })

  describe('updateProject edge cases', () => {
    it('should sanitize non-string mcpServerUrl', () => {
      const { result } = renderHook(() => useProjectStore())
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      let projectId: string

      act(() => {
        result.current.addProject({ name: 'Project', path: '/path' })
      })

      projectId = result.current.projects[0]?.id ?? ''

      act(() => {
        result.current.updateProject(projectId, {
          mcpServerUrl: { invalid: 'object' } as any,
        })
      })

      const project = result.current.projects.find((p) => p.id === projectId)
      expect(project?.mcpServerUrl).toBeUndefined()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Attempted to set mcpServerUrl to non-string value:',
        { invalid: 'object' }
      )

      consoleSpy.mockRestore()
    })
  })

  describe('persistence', () => {
    it('should persist state to localStorage', () => {
      const { result } = renderHook(() => useProjectStore())

      act(() => {
        result.current.addProject({ name: 'Persistent', path: '/persist' })
      })

      // Check localStorage
      const stored = localStorage.getItem('happy-observatory-projects')
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed.state.projects).toHaveLength(1)
      expect(parsed.state.projects[0].name).toBe('Persistent')
    })

    it('should handle rehydration with date parsing', () => {
      const now = new Date()
      const storedState = {
        state: {
          projects: [
            {
              id: 'test-1',
              name: 'Hydrated Project',
              path: '/hydrated',
              lastAccessed: now.toISOString(),
              mcpServerUrl: 'http://valid-url',
            },
          ],
          selectedProjectId: 'test-1',
          selectedProject: {
            id: 'test-1',
            name: 'Hydrated Project',
            path: '/hydrated',
            lastAccessed: now.toISOString(),
            mcpServerUrl: { invalid: 'object' }, // Invalid URL
          },
        },
        version: 0,
      }

      localStorage.setItem('happy-observatory-projects', JSON.stringify(storedState))

      // Create new store instance to trigger rehydration
      const { result } = renderHook(() => useProjectStore())

      // Force rehydration
      act(() => {
        useProjectStore.persist.rehydrate()
      })

      // Check that dates were parsed correctly
      const project = result.current.projects[0]
      expect(project?.lastAccessed).toBeInstanceOf(Date)
      expect(project?.mcpServerUrl).toBe('http://valid-url')

      // Check that invalid mcpServerUrl was cleaned up in selectedProject
      expect(result.current.selectedProject?.mcpServerUrl).toBeUndefined()
    })

    it('should handle rehydration errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Set invalid JSON in localStorage
      localStorage.setItem('happy-observatory-projects', 'invalid json')

      // Create new store instance
      const { result } = renderHook(() => useProjectStore())

      // Should have empty state
      expect(result.current.projects).toHaveLength(0)

      consoleSpy.mockRestore()
    })
  })
})
