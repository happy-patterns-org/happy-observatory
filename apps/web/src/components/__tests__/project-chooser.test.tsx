import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectChooser } from '../project-chooser'
import { useProjectStore } from '@/store/project-store'

// Mock the store
jest.mock('@/store/project-store')

describe('ProjectChooser', () => {
  const mockAddProject = jest.fn()
  const mockRemoveProject = jest.fn()
  const mockSelectProject = jest.fn()

  const defaultMockStore = {
    projects: [],
    selectedProject: null,
    selectProject: mockSelectProject,
    addProject: mockAddProject,
    removeProject: mockRemoveProject,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useProjectStore as unknown as jest.Mock).mockReturnValue(defaultMockStore)
  })

  it('should render with no selected project', () => {
    render(<ProjectChooser />)

    expect(screen.getByText('Select Project')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /select project/i })).toBeInTheDocument()
  })

  it('should show selected project name', () => {
    ;(useProjectStore as unknown as jest.Mock).mockReturnValue({
      ...defaultMockStore,
      selectedProject: { id: '1', name: 'My Project', path: '/path' },
    })

    render(<ProjectChooser />)

    expect(screen.getByText('My Project')).toBeInTheDocument()
  })

  it('should toggle dropdown on click', async () => {
    const user = userEvent.setup()
    render(<ProjectChooser />)

    const button = screen.getByRole('button', { name: /select project/i })

    // Initially closed
    expect(screen.queryByText('Add New Project')).not.toBeInTheDocument()

    // Open dropdown
    await user.click(button)
    expect(screen.getByText('Add New Project')).toBeInTheDocument()

    // Close dropdown
    await user.click(button)
    await waitFor(() => {
      expect(screen.queryByText('Add New Project')).not.toBeInTheDocument()
    })
  })

  it('should show project list', async () => {
    const mockProjects = [
      {
        id: '1',
        name: 'Project 1',
        path: '/path1',
        hasSubmoduleMCP: true,
        agentActivity: { activeAgents: 2, totalTasks: 10, completedTasks: 5 },
      },
      {
        id: '2',
        name: 'Project 2',
        path: '/path2',
        description: 'Test description',
      },
    ]
    ;(useProjectStore as unknown as jest.Mock).mockReturnValue({
      ...defaultMockStore,
      projects: mockProjects,
    })

    const user = userEvent.setup()
    render(<ProjectChooser />)

    await user.click(screen.getByRole('button', { name: /select project/i }))

    expect(screen.getByText('Project 1')).toBeInTheDocument()
    expect(screen.getByText('/path1')).toBeInTheDocument()
    expect(screen.getByText('MCP Server')).toBeInTheDocument()
    expect(screen.getByText('2 active')).toBeInTheDocument()

    expect(screen.getByText('Project 2')).toBeInTheDocument()
    expect(screen.getByText('/path2')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('should select project on click', async () => {
    const mockProjects = [{ id: '1', name: 'Project 1', path: '/path1' }]
    ;(useProjectStore as unknown as jest.Mock).mockReturnValue({
      ...defaultMockStore,
      projects: mockProjects,
    })

    const user = userEvent.setup()
    render(<ProjectChooser />)

    await user.click(screen.getByRole('button', { name: /select project/i }))
    await user.click(screen.getByText('Project 1'))

    expect(mockSelectProject).toHaveBeenCalledWith('1')
  })

  it('should open add project dialog', async () => {
    const user = userEvent.setup()
    render(<ProjectChooser />)

    await user.click(screen.getByRole('button', { name: /select project/i }))
    await user.click(screen.getByRole('button', { name: 'Add New Project' }))

    // Check for dialog heading specifically
    expect(screen.getByRole('heading', { name: 'Add New Project' })).toBeInTheDocument()
    expect(screen.getByLabelText('Project Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Project Path')).toBeInTheDocument()
    expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument()
  })

  it('should validate and add new project', async () => {
    const user = userEvent.setup()
    render(<ProjectChooser />)

    // Open dialog
    await user.click(screen.getByRole('button', { name: /select project/i }))
    await user.click(screen.getByRole('button', { name: 'Add New Project' }))

    // Fill form
    await user.type(screen.getByLabelText('Project Name'), 'New Project')
    await user.type(screen.getByLabelText('Project Path'), '/test/path')
    await user.type(screen.getByLabelText('Description (optional)'), 'Test description')

    // Submit
    await user.click(screen.getByRole('button', { name: /add project/i }))

    expect(mockAddProject).toHaveBeenCalledWith({
      name: 'New Project',
      path: '/test/path',
      description: 'Test description',
    })
  })

  it('should show validation error for invalid project name', async () => {
    const user = userEvent.setup()
    render(<ProjectChooser />)

    // Open dialog
    await user.click(screen.getByRole('button', { name: /select project/i }))
    await user.click(screen.getByRole('button', { name: 'Add New Project' }))

    // Fill with invalid data
    await user.type(screen.getByLabelText('Project Name'), 'Project@#$%')
    await user.type(screen.getByLabelText('Project Path'), 'relative/path')

    // Submit
    await user.click(screen.getByRole('button', { name: /add project/i }))

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/can only contain letters/i)).toBeInTheDocument()
    })

    expect(mockAddProject).not.toHaveBeenCalled()
  })

  it('should remove project', async () => {
    const mockProjects = [{ id: '1', name: 'Project 1', path: '/path1' }]
    ;(useProjectStore as unknown as jest.Mock).mockReturnValue({
      ...defaultMockStore,
      projects: mockProjects,
    })

    const user = userEvent.setup()
    render(<ProjectChooser />)

    await user.click(screen.getByRole('button', { name: /select project/i }))

    // Hover to show remove button
    const projectItem = screen.getByText('Project 1').closest('div')
    fireEvent.mouseEnter(projectItem!)

    // Click remove button
    const removeButton = screen.getByRole('button', { name: '' })
    await user.click(removeButton)

    expect(mockRemoveProject).toHaveBeenCalledWith('1')
  })

  it('should cancel add project dialog', async () => {
    const user = userEvent.setup()
    render(<ProjectChooser />)

    // Open dialog
    await user.click(screen.getByRole('button', { name: /select project/i }))
    await user.click(screen.getByRole('button', { name: 'Add New Project' }))

    // Type something
    await user.type(screen.getByLabelText('Project Name'), 'Test')

    // Cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByLabelText('Project Name')).not.toBeInTheDocument()
    })

    expect(mockAddProject).not.toHaveBeenCalled()
  })
})
