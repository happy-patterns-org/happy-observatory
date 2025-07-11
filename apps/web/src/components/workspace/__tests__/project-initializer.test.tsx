import { vi } from 'vitest'
import { render } from '@/test-utils/component-test'
import { ProjectInitializer } from '../project-initializer'
import { useProjectStore } from '@/store/project-store'
import type { Project } from '@/store/project-store'

// Mock the store
vi.mock('@/store/project-store')

// Mock config
vi.mock('@/config-adapter', () => ({
  default: {
    mcpServerUrl: 'http://localhost:8080',
  },
}))

describe('ProjectInitializer', () => {
  const mockAddProject = vi.fn()
  const mockSelectProject = vi.fn()
  const mockUpdateProject = vi.fn()

  const createMockProject = (overrides: Partial<Project> = {}): Project => ({
    id: 'test-1',
    name: 'Test Project',
    path: '/test/path',
    lastAccessed: new Date(),
    ...overrides,
  })

  const defaultMockStore = {
    projects: [],
    selectedProject: null,
    addProject: mockAddProject,
    selectProject: mockSelectProject,
    updateProject: mockUpdateProject,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useProjectStore).mockReturnValue(defaultMockStore)
  })

  describe('Rendering', () => {
    it('should render null', () => {
      const { container } = render(<ProjectInitializer />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('MCP Server URL Fixes', () => {
    it('should fix projects with port 8001 to port 8080', () => {
      const projectWithWrongPort = createMockProject({
        id: 'test-1',
        mcpServerUrl: 'http://localhost:8001',
      })

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [projectWithWrongPort],
      })

      render(<ProjectInitializer />)

      expect(mockUpdateProject).toHaveBeenCalledWith('test-1', {
        mcpServerUrl: 'http://localhost:8080',
      })
    })

    it('should not update projects with correct port', () => {
      const projectWithCorrectPort = createMockProject({
        id: 'test-1',
        mcpServerUrl: 'http://localhost:8080',
      })

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [projectWithCorrectPort],
      })

      render(<ProjectInitializer />)

      expect(mockUpdateProject).not.toHaveBeenCalled()
    })

    it('should fix multiple projects with wrong ports', () => {
      const projects = [
        createMockProject({
          id: 'test-1',
          mcpServerUrl: 'http://localhost:8001',
        }),
        createMockProject({
          id: 'test-2',
          mcpServerUrl: 'https://example.com:8001/api',
        }),
        createMockProject({
          id: 'test-3',
          mcpServerUrl: 'http://localhost:8080',
        }),
      ]

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects,
      })

      render(<ProjectInitializer />)

      expect(mockUpdateProject).toHaveBeenCalledTimes(2)
      expect(mockUpdateProject).toHaveBeenCalledWith('test-1', {
        mcpServerUrl: 'http://localhost:8080',
      })
      expect(mockUpdateProject).toHaveBeenCalledWith('test-2', {
        mcpServerUrl: 'https://example.com:8080/api',
      })
    })

    it('should handle projects without mcpServerUrl', () => {
      const projectWithoutUrl = createMockProject({
        id: 'test-1',
        mcpServerUrl: undefined,
      })

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [projectWithoutUrl],
      })

      render(<ProjectInitializer />)

      expect(mockUpdateProject).not.toHaveBeenCalled()
    })
  })

  describe('DevKit Project Management', () => {
    it('should create devkit project if it does not exist', () => {
      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [],
      })

      render(<ProjectInitializer />)

      expect(mockAddProject).toHaveBeenCalledWith({
        name: 'Happy DevKit',
        path: '/Users/verlyn13/Development/business-org/happy-devkit',
        description: 'Main development environment',
        hasSubmoduleMCP: true,
        mcpServerUrl: 'http://localhost:8080',
      })
    })

    it('should not create devkit project if it already exists', () => {
      const devkitProject = createMockProject({
        id: 'devkit',
        name: 'Happy DevKit',
      })

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [devkitProject],
      })

      render(<ProjectInitializer />)

      expect(mockAddProject).not.toHaveBeenCalled()
    })

    it('should update project with incorrect devkit ID', () => {
      const incorrectDevkit = createMockProject({
        id: 'wrong-id',
        name: 'Happy DevKit',
      })

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [incorrectDevkit],
      })

      render(<ProjectInitializer />)

      expect(mockUpdateProject).toHaveBeenCalledWith('wrong-id', { id: 'devkit' })
    })

    it('should detect devkit by lowercase name match', () => {
      const incorrectDevkit = createMockProject({
        id: 'wrong-id',
        name: 'happy devkit project',
      })

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [incorrectDevkit],
      })

      render(<ProjectInitializer />)

      expect(mockUpdateProject).toHaveBeenCalledWith('wrong-id', { id: 'devkit' })
    })

    it('should not update if both correct and incorrect devkit exist', () => {
      const projects = [
        createMockProject({
          id: 'devkit',
          name: 'Happy DevKit',
        }),
        createMockProject({
          id: 'wrong-id',
          name: 'Another DevKit',
        }),
      ]

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects,
      })

      render(<ProjectInitializer />)

      // Should not update the incorrect one since correct one exists
      expect(mockUpdateProject).not.toHaveBeenCalledWith('wrong-id', { id: 'devkit' })
    })
  })

  describe('Project Selection', () => {
    it('should select devkit if no project is selected', () => {
      const devkitProject = createMockProject({
        id: 'devkit',
        name: 'Happy DevKit',
      })

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [devkitProject],
        selectedProject: null,
      })

      render(<ProjectInitializer />)

      expect(mockSelectProject).toHaveBeenCalledWith('devkit')
    })

    it('should not select if a project is already selected', () => {
      const projects = [
        createMockProject({
          id: 'devkit',
          name: 'Happy DevKit',
        }),
        createMockProject({
          id: 'other',
          name: 'Other Project',
        }),
      ]

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects,
        selectedProject: projects[1],
      })

      render(<ProjectInitializer />)

      expect(mockSelectProject).not.toHaveBeenCalled()
    })

    it('should not select if devkit does not exist', () => {
      const otherProject = createMockProject({
        id: 'other',
        name: 'Other Project',
      })

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [otherProject],
        selectedProject: null,
      })

      render(<ProjectInitializer />)

      expect(mockSelectProject).not.toHaveBeenCalled()
    })

    it('should not select if no projects exist', () => {
      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [],
        selectedProject: null,
      })

      render(<ProjectInitializer />)

      expect(mockSelectProject).not.toHaveBeenCalled()
    })
  })

  describe('ScopeCam Project Detection', () => {
    it('should detect scopecam project by name', () => {
      const scopecamProject = createMockProject({
        id: 'some-id',
        name: 'ScopeCam Test Suite',
      })

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [scopecamProject],
      })

      render(<ProjectInitializer />)

      // The component only detects incorrect scopecam projects but doesn't update them
      // This is noted in the comment at line 41-42
      expect(mockUpdateProject).not.toHaveBeenCalledWith('some-id', { id: 'scopecam' })
    })

    it('should not detect if scopecam project already has correct ID', () => {
      const scopecamProject = createMockProject({
        id: 'scopecam',
        name: 'ScopeCam',
      })

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [scopecamProject],
      })

      render(<ProjectInitializer />)

      expect(mockUpdateProject).not.toHaveBeenCalled()
    })
  })

  describe('Effect Dependencies', () => {
    it('should re-run effect when projects length changes', () => {
      const { rerender } = render(<ProjectInitializer />)

      expect(mockAddProject).toHaveBeenCalledTimes(1)

      // Clear the mock to track new calls
      mockAddProject.mockClear()

      // Add devkit project to the store (simulating it was added)
      const devkitProject = createMockProject({
        id: 'devkit',
        name: 'Happy DevKit',
      })

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [devkitProject],
      })

      rerender(<ProjectInitializer />)

      // Effect runs again due to projects.length change, but should not add devkit 
      // since it already exists in the store
      expect(mockAddProject).not.toHaveBeenCalled()
      
      // Should select devkit since no project was selected
      expect(mockSelectProject).toHaveBeenCalledWith('devkit')
    })

    it('should handle console.log for debugging', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const projectWithWrongPort = createMockProject({
        id: 'test-1',
        name: 'Test Project',
        mcpServerUrl: 'http://localhost:8001',
      })

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [projectWithWrongPort],
      })

      render(<ProjectInitializer />)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Fixing incorrect MCP server URL for project:',
        'Test Project'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle multiple operations in one render', () => {
      const projects = [
        createMockProject({
          id: 'wrong-devkit-id',
          name: 'Happy DevKit',
          mcpServerUrl: 'http://localhost:8001',
        }),
        createMockProject({
          id: 'other',
          name: 'Other Project',
          mcpServerUrl: 'http://localhost:8001',
        }),
      ]

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects,
        selectedProject: null,
      })

      render(<ProjectInitializer />)

      // Should fix both MCP URLs
      expect(mockUpdateProject).toHaveBeenCalledWith('wrong-devkit-id', {
        mcpServerUrl: 'http://localhost:8080',
      })
      expect(mockUpdateProject).toHaveBeenCalledWith('other', {
        mcpServerUrl: 'http://localhost:8080',
      })

      // Should fix devkit ID
      expect(mockUpdateProject).toHaveBeenCalledWith('wrong-devkit-id', { id: 'devkit' })

      // Should not add devkit since it exists (with wrong ID)
      expect(mockAddProject).not.toHaveBeenCalled()

      // Should not select since devkit doesn't have correct ID yet
      expect(mockSelectProject).not.toHaveBeenCalled()
    })

    it('should handle empty project list gracefully', () => {
      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [],
        selectedProject: null,
      })

      render(<ProjectInitializer />)

      expect(mockAddProject).toHaveBeenCalledTimes(1)
      expect(mockSelectProject).not.toHaveBeenCalled()
      expect(mockUpdateProject).not.toHaveBeenCalled()
    })
  })
})