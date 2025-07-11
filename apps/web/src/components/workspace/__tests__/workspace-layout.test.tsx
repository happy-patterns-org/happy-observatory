import { vi } from 'vitest'
import { render, screen, setupComponentTest } from '@/test-utils/component-test'
import userEvent from '@testing-library/user-event'
import { WorkspaceLayout } from '../workspace-layout'
import type { Project } from '@/store/project-store'

// Mock components
vi.mock('../../project-chooser', () => ({
  ProjectChooser: () => <div data-testid="project-chooser">Project Chooser</div>,
}))

vi.mock('../project-initializer', () => ({
  ProjectInitializer: () => <div data-testid="project-initializer">Project Initializer</div>,
}))

describe('WorkspaceLayout', () => {
  const mockOnSidebarToggle = vi.fn()
  
  const defaultProps = {
    sidebarCollapsed: false,
    onSidebarToggle: mockOnSidebarToggle,
    consoleCollapsed: false,
    selectedProject: null,
  }

  const mockProject: Project = {
    id: 'test-1',
    name: 'Test Project',
    path: '/test/path',
    lastAccessed: new Date(),
    description: 'Test description',
  }

  beforeEach(() => {
    setupComponentTest()
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all main sections', () => {
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Test Content</div>
        </WorkspaceLayout>
      )

      // Project initializer
      expect(screen.getByTestId('project-initializer')).toBeInTheDocument()

      // Sidebar
      expect(screen.getByRole('complementary')).toBeInTheDocument()
      
      // Header
      expect(screen.getByRole('banner')).toBeInTheDocument()
      
      // Main content area
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()

      // Project chooser
      expect(screen.getByTestId('project-chooser')).toBeInTheDocument()
    })

    it('should render sidebar branding when expanded', () => {
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      expect(screen.getByText('Happy Observatory')).toBeInTheDocument()
      const logo = screen.getByText('Happy Observatory').previousSibling
      expect(logo).toHaveClass('bg-gradient-to-br', 'from-dawn-500', 'to-morning-500')
    })

    it('should render navigation items', () => {
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      expect(screen.getByRole('link', { name: 'Activity' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Git' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Agents' })).toBeInTheDocument()
    })

    it('should render settings button', () => {
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    })

    it('should display selected project name in header', () => {
      render(
        <WorkspaceLayout {...defaultProps} selectedProject={mockProject}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      expect(screen.getByText('Project:')).toBeInTheDocument()
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    it('should not display project info when no project selected', () => {
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      expect(screen.queryByText('Project:')).not.toBeInTheDocument()
    })
  })

  describe('Sidebar Collapse State', () => {
    it('should show expanded sidebar by default', () => {
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      const sidebar = screen.getByRole('complementary')
      expect(sidebar).toHaveClass('w-64')
      expect(sidebar).not.toHaveClass('w-16')

      // Should show labels
      expect(screen.getByText('Activity')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should show collapsed sidebar when sidebarCollapsed is true', () => {
      render(
        <WorkspaceLayout {...defaultProps} sidebarCollapsed={true}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      const sidebar = screen.getByRole('complementary')
      expect(sidebar).toHaveClass('w-16')
      expect(sidebar).not.toHaveClass('w-64')

      // Should not show branding or labels
      expect(screen.queryByText('Happy Observatory')).not.toBeInTheDocument()
      expect(screen.queryByText('Activity')).not.toBeInTheDocument()
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })

    it('should show correct toggle button icon based on state', () => {
      const { rerender } = render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      // Expanded state - should show collapse icon
      let toggleButton = screen.getByRole('button', { name: 'Collapse sidebar' })
      expect(toggleButton).toBeInTheDocument()

      // Collapsed state - should show expand icon
      rerender(
        <WorkspaceLayout {...defaultProps} sidebarCollapsed={true}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      toggleButton = screen.getByRole('button', { name: 'Expand sidebar' })
      expect(toggleButton).toBeInTheDocument()
    })

    it('should add title attributes to nav items when collapsed', () => {
      render(
        <WorkspaceLayout {...defaultProps} sidebarCollapsed={true}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      expect(screen.getByRole('link', { name: 'Activity' })).toHaveAttribute('title', 'Activity')
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('title', 'Dashboard')
      expect(screen.getByRole('link', { name: 'Git' })).toHaveAttribute('title', 'Git')
      expect(screen.getByRole('link', { name: 'Agents' })).toHaveAttribute('title', 'Agents')
      expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('title', 'Settings')
    })

    it('should not have title attributes when expanded', () => {
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      expect(screen.getByRole('link', { name: 'Activity' })).not.toHaveAttribute('title')
      expect(screen.getByRole('button', { name: 'Settings' })).not.toHaveAttribute('title')
    })
  })

  describe('Interactions', () => {
    it('should call onSidebarToggle when toggle button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      const toggleButton = screen.getByRole('button', { name: 'Collapse sidebar' })
      await user.click(toggleButton)

      expect(mockOnSidebarToggle).toHaveBeenCalledTimes(1)
    })

    it('should have correct href attributes on navigation links', () => {
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      expect(screen.getByRole('link', { name: 'Activity' })).toHaveAttribute('href', '#activity')
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '#dashboard')
      expect(screen.getByRole('link', { name: 'Git' })).toHaveAttribute('href', '#git')
      expect(screen.getByRole('link', { name: 'Agents' })).toHaveAttribute('href', '#agents')
    })

    it('should apply hover styles to navigation items', async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      const activityLink = screen.getByRole('link', { name: 'Activity' })
      
      // Check hover classes are present
      expect(activityLink).toHaveClass('hover:bg-stone-100', 'hover:text-stone-900')
      
      // Hover interaction
      await user.hover(activityLink)
      
      // Note: Actual hover styles are applied via CSS, we just verify the classes exist
    })

    it('should render all navigation icons', () => {
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      const navLinks = screen.getAllByRole('link')
      
      // Each link should have an icon (svg element)
      navLinks.forEach(link => {
        const icon = link.querySelector('svg')
        expect(icon).toBeInTheDocument()
        expect(icon).toHaveClass('w-5', 'h-5')
      })
    })
  })

  describe('Layout Structure', () => {
    it('should apply correct CSS classes for layout', () => {
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      // Main container
      const mainContainer = screen.getByRole('complementary').parentElement
      expect(mainContainer).toHaveClass('flex', 'h-screen', 'bg-stone-workspace')

      // Sidebar
      const sidebar = screen.getByRole('complementary')
      expect(sidebar).toHaveClass('bg-white', 'border-r', 'border-stone-200')

      // Header
      const header = screen.getByRole('banner')
      expect(header).toHaveClass('h-16', 'bg-white', 'border-b', 'border-stone-200')

      // Main content
      const main = screen.getByRole('main')
      expect(main).toHaveClass('flex-1', 'overflow-hidden')
    })

    it('should center navigation items when sidebar is collapsed', () => {
      render(
        <WorkspaceLayout {...defaultProps} sidebarCollapsed={true}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      const navLinks = screen.getAllByRole('link')
      navLinks.forEach(link => {
        expect(link).toHaveClass('justify-center')
      })

      const settingsButton = screen.getByRole('button', { name: 'Settings' })
      expect(settingsButton).toHaveClass('justify-center')
    })

    it('should pass children to main content area', () => {
      const TestChild = () => <div data-testid="test-child">Test Child Component</div>
      
      render(
        <WorkspaceLayout {...defaultProps}>
          <TestChild />
        </WorkspaceLayout>
      )

      const main = screen.getByRole('main')
      const child = screen.getByTestId('test-child')
      
      expect(main).toContainElement(child)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      expect(screen.getByRole('complementary')).toBeInTheDocument() // aside
      expect(screen.getByRole('navigation')).toBeInTheDocument() // nav
      expect(screen.getByRole('banner')).toBeInTheDocument() // header
      expect(screen.getByRole('main')).toBeInTheDocument() // main
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      // Tab through interactive elements
      await user.tab()
      expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('link', { name: 'Activity' })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('link', { name: 'Git' })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('link', { name: 'Agents' })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus()
    })

    it('should have descriptive button labels', () => {
      const { rerender } = render(
        <WorkspaceLayout {...defaultProps}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()

      rerender(
        <WorkspaceLayout {...defaultProps} sidebarCollapsed={true}>
          <div>Content</div>
        </WorkspaceLayout>
      )

      expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
    })
  })
})