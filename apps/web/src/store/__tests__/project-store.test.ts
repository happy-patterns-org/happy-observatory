import { renderHook, act } from '@testing-library/react'
import { useProjectStore } from '../project-store'

describe('Project Store', () => {
  beforeEach(() => {
    // Use fake timers
    jest.useFakeTimers()

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
    jest.useRealTimers()
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
      expect(result.current.projects[0].name).toBe('Project 1')
      expect(result.current.projects[1].name).toBe('Project 2')
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
      projectId = result.current.projects[0].id

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
      projectId = result.current.projects[0].id

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
      projectId = result.current.projects[0].id

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
      projectId = result.current.projects[0].id
      originalDate = result.current.projects[0].lastAccessed!

      // Wait a bit to ensure date changes
      act(() => {
        jest.advanceTimersByTime(100)
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

      const projectId = result.current.projects[0].id

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
      projectId = result.current.projects[0].id

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
      projectId = result.current.projects[0].id

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
      projectId = result.current.projects[0].id

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
  })
})
