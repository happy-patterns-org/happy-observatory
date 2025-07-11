import { vi, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen, setupComponentTest, waitFor } from '@/test-utils/component-test'
import userEvent from '@testing-library/user-event'
import { ProjectChooser } from '../project-chooser'
import { useProjectStore } from '@/store/project-store'
import { useProjects } from '@/hooks/use-projects'
import type { Project } from '@/store/project-store'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock dependencies
vi.mock('@/store/project-store')
vi.mock('@/hooks/use-projects')
vi.mock('@/lib/mcp-detector-enhanced', () => ({
  detectMCPServer: vi.fn().mockResolvedValue({
    isAvailable: false,
    serverUrl: null,
  }),
}))
vi.mock('@/lib/project-detector', () => ({
  ProjectDetector: {
    detectLocalProjects: vi.fn().mockResolvedValue([]),
  },
}))

// Setup MSW server
const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

describe('ProjectChooser - Extended Tests', () => {
  const mockAddProject = vi.fn()
  const mockRemoveProject = vi.fn()
  const mockSelectProject = vi.fn()

  const defaultMockStore = {
    projects: [],
    selectedProject: null,
    selectProject: mockSelectProject,
    addProject: mockAddProject,
    removeProject: mockRemoveProject,
  }

  const defaultMockHook = {
    projects: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }

  beforeEach(() => {
    setupComponentTest()
    vi.clearAllMocks()
    vi.mocked(useProjectStore).mockReturnValue(defaultMockStore)
    vi.mocked(useProjects).mockReturnValue(defaultMockHook)
  })

  describe('Visual Styling', () => {
    it('should apply custom color styling when project has color', () => {
      const coloredProject: Project = {
        id: 'colored',
        name: 'Colored Project',
        path: '/colored',
        lastAccessed: new Date(),
        color: '#FF5733',
      }

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        selectedProject: coloredProject,
      })

      render(<ProjectChooser />)

      const button = screen.getByRole('button', { name: /colored project/i })
      const styles = window.getComputedStyle(button)
      
      // Check inline styles
      expect(button).toHaveStyle({
        borderColor: '#FF573340',
        backgroundColor: '#FF573308',
      })
    })

    it('should show project icon with custom icon', async () => {
      const projectWithIcon: Project = {
        id: 'icon-project',
        name: 'Icon Project',
        path: '/icon',
        lastAccessed: new Date(),
        icon: 'git',
      }

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [projectWithIcon],
      })
      vi.mocked(useProjects).mockReturnValue({
        ...defaultMockHook,
        projects: [projectWithIcon],
      })

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))

      // ProjectIcon component should be rendered with icon prop
      const projectItem = screen.getByText('Icon Project')
      expect(projectItem).toBeInTheDocument()
    })

    it('should show color dot for projects with color', async () => {
      const projectWithColor: Project = {
        id: 'colored',
        name: 'Colored Project',
        path: '/colored',
        lastAccessed: new Date(),
        color: '#00FF00',
      }

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [projectWithColor],
      })
      vi.mocked(useProjects).mockReturnValue({
        ...defaultMockHook,
        projects: [projectWithColor],
      })

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))

      // Should render a color dot
      await waitFor(() => {
        const projectName = screen.getByText('Colored Project')
        expect(projectName).toBeInTheDocument()
        
        // The color dot is a sibling of the project name
        const colorDot = projectName.parentElement?.querySelector('.w-2.h-2.rounded-full')
        expect(colorDot).toBeDefined()
        expect(colorDot).toHaveStyle({ backgroundColor: '#00FF00' })
      })
    })
  })

  describe('Auto-detect Projects', () => {
    it('should show auto-detect button in dropdown', async () => {
      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))

      expect(screen.getByRole('button', { name: /auto-detect projects/i })).toBeInTheDocument()
    })

    it('should open auto-detect dialog when clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))
      await user.click(screen.getByRole('button', { name: /auto-detect projects/i }))

      expect(screen.getByRole('heading', { name: 'Detected Projects' })).toBeInTheDocument()
      // The dialog should show loading state initially, but it immediately resolves
      // because detectLocalProjects is mocked to return [] immediately
      await waitFor(() => {
        expect(screen.getByText('No new projects found.')).toBeInTheDocument()
      })
    })

    it('should display detected projects', async () => {
      const { ProjectDetector } = await import('@/lib/project-detector')
      vi.mocked(ProjectDetector.detectLocalProjects).mockResolvedValueOnce([
        {
          name: 'Detected Project 1',
          path: '/detected/project1',
          type: 'npm',
          description: 'A Node.js project',
          hasGit: true,
          hasMCP: false,
        },
        {
          name: 'Detected Project 2',
          path: '/detected/project2',
          type: 'python',
          description: 'A Python project',
          hasGit: false,
          hasMCP: true,
        },
      ])

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))
      await user.click(screen.getByRole('button', { name: /auto-detect projects/i }))

      await waitFor(() => {
        expect(screen.getByText('Detected Project 1')).toBeInTheDocument()
        expect(screen.getByText('/detected/project1')).toBeInTheDocument()
        expect(screen.getByText('A Node.js project')).toBeInTheDocument()
        expect(screen.getByText('npm')).toBeInTheDocument()
        expect(screen.getByText('Git')).toBeInTheDocument()

        expect(screen.getByText('Detected Project 2')).toBeInTheDocument()
        expect(screen.getByText('/detected/project2')).toBeInTheDocument()
        expect(screen.getByText('A Python project')).toBeInTheDocument()
        expect(screen.getByText('python')).toBeInTheDocument()
        expect(screen.getByText('MCP')).toBeInTheDocument()
      })
    })

    it('should filter out already added projects', async () => {
      const existingProject: Project = {
        id: 'existing',
        name: 'Existing Project',
        path: '/detected/project1',
        lastAccessed: new Date(),
      }

      vi.mocked(useProjects).mockReturnValue({
        ...defaultMockHook,
        projects: [existingProject],
      })

      const { ProjectDetector } = await import('@/lib/project-detector')
      vi.mocked(ProjectDetector.detectLocalProjects).mockResolvedValueOnce([
        {
          name: 'Detected Project 1',
          path: '/detected/project1', // Same path as existing
          type: 'npm',
          description: 'Already exists',
          hasGit: true,
          hasMCP: false,
        },
        {
          name: 'New Project',
          path: '/detected/new',
          type: 'python',
          description: 'New project',
          hasGit: false,
          hasMCP: false,
        },
      ])

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))
      await user.click(screen.getByRole('button', { name: /auto-detect projects/i }))

      await waitFor(() => {
        // Should only show the new project
        expect(screen.queryByText('Detected Project 1')).not.toBeInTheDocument()
        expect(screen.getByText('New Project')).toBeInTheDocument()
      })
    })

    it('should add detected project when Add button is clicked', async () => {
      const { ProjectDetector } = await import('@/lib/project-detector')
      vi.mocked(ProjectDetector.detectLocalProjects).mockResolvedValueOnce([
        {
          name: 'Test Project',
          path: '/test/project',
          type: 'npm',
          description: 'Test description',
          hasGit: true,
          hasMCP: false,
        },
      ])

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))
      await user.click(screen.getByRole('button', { name: /auto-detect projects/i }))

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(mockAddProject).toHaveBeenCalledWith({
        name: 'Test Project',
        path: '/test/project',
        description: 'Test description',
      })
    })

    it('should check for MCP server when adding project with MCP', async () => {
      const { detectMCPServer } = await import('@/lib/mcp-detector-enhanced')
      vi.mocked(detectMCPServer).mockResolvedValueOnce({
        isAvailable: true,
        serverUrl: 'http://localhost:8080',
      })

      const { ProjectDetector } = await import('@/lib/project-detector')
      vi.mocked(ProjectDetector.detectLocalProjects).mockResolvedValueOnce([
        {
          name: 'MCP Project',
          path: '/mcp/project',
          type: 'npm',
          description: 'Has MCP',
          hasGit: false,
          hasMCP: true,
        },
      ])

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))
      await user.click(screen.getByRole('button', { name: /auto-detect projects/i }))

      await waitFor(() => {
        expect(screen.getByText('MCP Project')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Add' }))

      await waitFor(() => {
        expect(detectMCPServer).toHaveBeenCalledWith('/mcp/project')
        expect(mockAddProject).toHaveBeenCalledWith({
          name: 'MCP Project',
          path: '/mcp/project',
          description: 'Has MCP',
          hasSubmoduleMCP: true,
          mcpServerUrl: 'http://localhost:8080',
        })
      })
    })

    it('should handle DevKit project specially', async () => {
      // First, add a devkit project
      vi.mocked(useProjects).mockReturnValue({
        ...defaultMockHook,
        projects: [
          {
            id: 'devkit',
            name: 'Happy DevKit',
            path: '/old/devkit',
            lastAccessed: new Date(),
          },
        ],
      })

      const { ProjectDetector } = await import('@/lib/project-detector')
      vi.mocked(ProjectDetector.detectLocalProjects).mockResolvedValueOnce([
        {
          name: 'Happy DevKit New',
          path: '/new/happy-devkit',
          type: 'npm',
          description: 'DevKit project',
          hasGit: true,
          hasMCP: false,
        },
      ])

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))
      await user.click(screen.getByRole('button', { name: /auto-detect projects/i }))

      await waitFor(() => {
        expect(screen.getByText('Happy DevKit New')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Add' }))

      // Should remove from list but not add (since devkit already exists)
      await waitFor(() => {
        expect(mockAddProject).not.toHaveBeenCalled()
        expect(screen.queryByText('Happy DevKit New')).not.toBeInTheDocument()
      })
    })

    it('should show message when no projects detected', async () => {
      const { ProjectDetector } = await import('@/lib/project-detector')
      vi.mocked(ProjectDetector.detectLocalProjects).mockResolvedValueOnce([])

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))
      await user.click(screen.getByRole('button', { name: /auto-detect projects/i }))

      await waitFor(() => {
        expect(screen.getByText('No new projects found.')).toBeInTheDocument()
        expect(screen.getByText('All detected projects are already added.')).toBeInTheDocument()
      })
    })

    it('should handle detection errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { ProjectDetector } = await import('@/lib/project-detector')
      vi.mocked(ProjectDetector.detectLocalProjects).mockRejectedValueOnce(new Error('Detection failed'))

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))
      await user.click(screen.getByRole('button', { name: /auto-detect projects/i }))

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to detect projects:', expect.any(Error))
        expect(screen.getByText('No new projects found.')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should close auto-detect dialog', async () => {
      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))
      await user.click(screen.getByRole('button', { name: /auto-detect projects/i }))

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Detected Projects' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Close' }))

      expect(screen.queryByRole('heading', { name: 'Detected Projects' })).not.toBeInTheDocument()
    })
  })

  describe('Project List Display', () => {
    it('should show empty state when no projects', async () => {
      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))

      expect(screen.getByText('No projects added yet')).toBeInTheDocument()
    })

    it('should highlight selected project', async () => {
      const projects: Project[] = [
        {
          id: 'proj1',
          name: 'Project 1',
          path: '/path1',
          lastAccessed: new Date(),
        },
        {
          id: 'proj2',
          name: 'Project 2',
          path: '/path2',
          lastAccessed: new Date(),
        },
      ]

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects,
        selectedProject: projects[0],
      })
      vi.mocked(useProjects).mockReturnValue({
        ...defaultMockHook,
        projects,
      })

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /project 1/i }))

      // Check that the selected project has highlight styling
      // Get all instances of "Project 1" and find the one in the dropdown
      const allProjectTexts = screen.getAllByText('Project 1')
      const dropdownProjectText = allProjectTexts.find(el => 
        el.className.includes('font-medium text-sm')
      )
      expect(dropdownProjectText).toBeDefined()
      const projectItem = dropdownProjectText?.closest('div[class*="group"]')
      expect(projectItem).toHaveClass('bg-stone-100')
    })

    it('should close dropdown after selecting project', async () => {
      const project: Project = {
        id: 'test',
        name: 'Test Project',
        path: '/test',
        lastAccessed: new Date(),
      }

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [project],
      })
      vi.mocked(useProjects).mockReturnValue({
        ...defaultMockHook,
        projects: [project],
      })

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))
      expect(screen.getByText('Test Project')).toBeInTheDocument()

      await user.click(screen.getByText('Test Project'))

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText('Add New Project')).not.toBeInTheDocument()
      })
    })
  })

  describe('useProjects Hook Integration', () => {
    it('should use projects from useProjects hook', async () => {
      const hookProjects: Project[] = [
        {
          id: 'hook1',
          name: 'Hook Project 1',
          path: '/hook1',
          lastAccessed: new Date(),
        },
        {
          id: 'hook2',
          name: 'Hook Project 2',
          path: '/hook2',
          lastAccessed: new Date(),
        },
      ]

      vi.mocked(useProjects).mockReturnValue({
        ...defaultMockHook,
        projects: hookProjects,
      })

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))

      // Both projects from hook should be displayed
      expect(screen.getByText('Hook Project 1')).toBeInTheDocument()
      expect(screen.getByText('Hook Project 2')).toBeInTheDocument()
    })

    it('should configure useProjects with correct options', () => {
      render(<ProjectChooser />)

      expect(useProjects).toHaveBeenCalledWith({
        autoFetch: true,
        refreshInterval: 30000,
      })
    })
  })

  describe('Validation', () => {
    it('should reset form when reopening dialog', async () => {
      const user = userEvent.setup()
      render(<ProjectChooser />)

      // Open dialog and add some data
      await user.click(screen.getByRole('button', { name: /select project/i }))
      await user.click(screen.getByRole('button', { name: 'Add New Project' }))
      await user.type(screen.getByLabelText('Project Name'), 'Test Name')
      await user.type(screen.getByLabelText('Project Path'), '/test/path')

      // Close dialog by clicking cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }))
      
      // Wait for dialog to close
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Add New Project' })).not.toBeInTheDocument()
      })
      
      // Reopen dialog - form should be reset
      await user.click(screen.getByRole('button', { name: 'Add New Project' }))

      // Check that the form is reset
      expect(screen.getByLabelText('Project Name')).toHaveValue('')
      expect(screen.getByLabelText('Project Path')).toHaveValue('')
    })

    it('should disable add button when fields are empty', async () => {
      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))
      await user.click(screen.getByRole('button', { name: 'Add New Project' }))

      const addButton = screen.getByRole('button', { name: /add project/i })
      expect(addButton).toBeDisabled()

      // Type only name
      await user.type(screen.getByLabelText('Project Name'), 'Test')
      expect(addButton).toBeDisabled()

      // Type path too
      await user.type(screen.getByLabelText('Project Path'), '/test')
      expect(addButton).not.toBeDisabled()
    })
  })

  describe('Dropdown Behavior', () => {
    it('should rotate chevron icon when dropdown is open', async () => {
      const user = userEvent.setup()
      render(<ProjectChooser />)

      const button = screen.getByRole('button', { name: /select project/i })
      const chevron = button.querySelector('svg.lucide-chevron-down')

      expect(chevron).toBeDefined()
      expect(chevron).not.toHaveClass('rotate-180')

      await user.click(button)

      expect(chevron).toHaveClass('rotate-180')
    })

    it('should scroll project list when many projects', async () => {
      const manyProjects = Array.from({ length: 20 }, (_, i) => ({
        id: `proj${i}`,
        name: `Project ${i}`,
        path: `/path${i}`,
        lastAccessed: new Date(),
      }))

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: manyProjects,
      })
      vi.mocked(useProjects).mockReturnValue({
        ...defaultMockHook,
        projects: manyProjects,
      })

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))

      // Check for scrollable container
      const projectList = screen.getByText('Project 0').closest('div[class*="overflow-y-auto"]')
      expect(projectList).toHaveClass('max-h-64', 'overflow-y-auto')
    })
  })

  describe('Remove Button Behavior', () => {
    it('should stop propagation when clicking remove button', async () => {
      const project: Project = {
        id: 'test',
        name: 'Test Project',
        path: '/test',
        lastAccessed: new Date(),
      }

      vi.mocked(useProjectStore).mockReturnValue({
        ...defaultMockStore,
        projects: [project],
      })
      vi.mocked(useProjects).mockReturnValue({
        ...defaultMockHook,
        projects: [project],
      })

      const user = userEvent.setup()
      render(<ProjectChooser />)

      await user.click(screen.getByRole('button', { name: /select project/i }))

      // Wait for dropdown to be visible
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
      })

      // Find the project item container
      const projectItemContainer = screen.getByText('Test Project').closest('.group')
      expect(projectItemContainer).toBeDefined()
      
      // Find the remove button within that container
      const removeButton = projectItemContainer?.querySelector('button.opacity-0') as HTMLElement
      expect(removeButton).toBeDefined()

      // Click the remove button
      await user.click(removeButton)

      // Should call removeProject but not selectProject
      expect(mockRemoveProject).toHaveBeenCalledWith('test')
      expect(mockSelectProject).not.toHaveBeenCalled()
    })
  })
})