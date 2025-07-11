import { vi, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen, setupComponentTest, waitFor } from '@/test-utils/component-test'
import userEvent from '@testing-library/user-event'
import { DevKitConsole } from '../devkit-console'
import { useProjectStore } from '@/store/project-store'
import type { Project } from '@/store/project-store'
import { act } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock the store
vi.mock('@/store/project-store')

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

// Mock config adapter
vi.mock('@/config-adapter', () => ({
  API_PATHS: {
    consoleExecute: (projectId: string) => `/api/projects/${projectId}/console/execute`,
  },
}))

describe('DevKitConsole', () => {
  const mockOnToggle = vi.fn()

  const defaultProps = {
    collapsed: false,
    onToggle: mockOnToggle,
  }

  const mockProject: Project = {
    id: 'test-project',
    name: 'Test Project',
    path: '/test/path',
    lastAccessed: new Date(),
  }

  const defaultMockStore = {
    selectedProject: null,
  }

  beforeEach(() => {
    setupComponentTest()
    vi.clearAllMocks()
    vi.mocked(useProjectStore).mockReturnValue(defaultMockStore)
    
    // Mock fetch globally
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output: 'Command executed successfully', status: 'success' }),
    })
  })

  describe('Rendering', () => {
    it('should render console header with correct elements', () => {
      render(<DevKitConsole {...defaultProps} />)

      expect(screen.getByText('DevKit Console')).toBeInTheDocument()
      expect(screen.getByText(/to toggle/)).toBeInTheDocument()
    })

    it('should show platform-specific shortcut hint', () => {
      const originalPlatform = navigator.platform
      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: 'MacIntel',
      })

      render(<DevKitConsole {...defaultProps} />)
      
      expect(screen.getByText('⌘+` to toggle')).toBeInTheDocument()

      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: originalPlatform,
      })
    })

    it('should render console in collapsed state', () => {
      render(<DevKitConsole {...defaultProps} collapsed={true} />)

      expect(screen.getByText('DevKit Console')).toBeInTheDocument()
      expect(screen.queryByPlaceholderText('Enter command...')).not.toBeInTheDocument()
    })

    it('should render input area when expanded', () => {
      render(<DevKitConsole {...defaultProps} />)

      expect(screen.getByPlaceholderText('Enter command...')).toBeInTheDocument()
    })
  })

  describe('Command Execution', () => {
    it('should execute command on Enter key', async () => {
      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...')
      await user.type(input, 'ls -la{Enter}')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/console/execute',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              command: 'ls -la',
              projectPath: '/',
            }),
          }
        )
      })
    })

    it('should use project-specific API path when project is selected', async () => {
      vi.mocked(useProjectStore).mockReturnValue({
        selectedProject: mockProject,
      })

      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...')
      await user.type(input, 'pwd{Enter}')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/test-project/console/execute',
          expect.objectContaining({
            body: JSON.stringify({
              command: 'pwd',
              projectPath: '/test/path',
            }),
          })
        )
      })
    })

    it('should display command and output in history', async () => {
      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...')
      await user.type(input, 'echo "Hello World"{Enter}')

      await waitFor(() => {
        expect(screen.getByText('echo "Hello World"')).toBeInTheDocument()
        expect(screen.getByText('Command executed successfully')).toBeInTheDocument()
      })
    })

    it('should clear input after command execution', async () => {
      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...') as HTMLInputElement
      await user.type(input, 'test command{Enter}')

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('should handle error responses', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Command failed' }),
      })

      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...')
      await user.type(input, 'bad-command{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...')
      await user.type(input, 'test{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Error: Error: Network error')).toBeInTheDocument()
      })
    })

    it('should show running status while executing', async () => {
      let resolvePromise: any
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      vi.mocked(global.fetch).mockReturnValueOnce(delayedPromise as any)

      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...')
      await user.type(input, 'slow-command{Enter}')

      expect(screen.getByText('Executing...')).toBeInTheDocument()

      // Resolve the promise
      act(() => {
        resolvePromise({
          ok: true,
          json: async () => ({ output: 'Done', status: 'success' }),
        })
      })

      await waitFor(() => {
        expect(screen.queryByText('Executing...')).not.toBeInTheDocument()
        expect(screen.getByText('Done')).toBeInTheDocument()
      })
    })

    it('should not execute empty commands', async () => {
      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...')
      await user.type(input, '   {Enter}')

      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Clear Command', () => {
    it('should clear history when clear command is executed', async () => {
      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...')
      
      // Execute some commands first
      await user.type(input, 'echo test{Enter}')
      await waitFor(() => {
        expect(screen.getByText('echo test')).toBeInTheDocument()
      })

      // Execute clear command
      await user.type(input, 'clear{Enter}')

      await waitFor(() => {
        expect(screen.queryByText('echo test')).not.toBeInTheDocument()
      })
    })
  })

  describe('Command History Navigation', () => {
    it('should navigate through command history with arrow keys', async () => {
      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...') as HTMLInputElement

      // Execute multiple commands
      await user.type(input, 'first command{Enter}')
      await user.clear(input)
      await user.type(input, 'second command{Enter}')
      await user.clear(input)
      await user.type(input, 'third command{Enter}')

      // Navigate up through history
      await user.keyboard('{ArrowUp}')
      expect(input.value).toBe('third command')

      await user.keyboard('{ArrowUp}')
      expect(input.value).toBe('second command')

      await user.keyboard('{ArrowUp}')
      expect(input.value).toBe('first command')

      // Navigate down through history
      await user.keyboard('{ArrowDown}')
      expect(input.value).toBe('second command')

      await user.keyboard('{ArrowDown}')
      expect(input.value).toBe('third command')

      await user.keyboard('{ArrowDown}')
      expect(input.value).toBe('')
    })

    it('should not go beyond history bounds', async () => {
      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...') as HTMLInputElement

      await user.type(input, 'only command{Enter}')

      // Try to go up beyond history
      await user.keyboard('{ArrowUp}')
      expect(input.value).toBe('only command')

      await user.keyboard('{ArrowUp}')
      expect(input.value).toBe('only command')

      // Go down to clear
      await user.keyboard('{ArrowDown}')
      expect(input.value).toBe('')

      // Try to go down beyond empty
      await user.keyboard('{ArrowDown}')
      expect(input.value).toBe('')
    })
  })

  describe('Interactions', () => {
    it('should toggle collapsed state when toggle button is clicked', async () => {
      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /collapse console/i })
      await user.click(toggleButton)

      expect(mockOnToggle).toHaveBeenCalledTimes(1)
    })

    it('should show correct toggle button title based on state', () => {
      const { rerender } = render(<DevKitConsole {...defaultProps} collapsed={false} />)

      expect(screen.getByRole('button', { name: /collapse console/i })).toBeInTheDocument()

      rerender(<DevKitConsole {...defaultProps} collapsed={true} />)

      expect(screen.getByRole('button', { name: /expand console/i })).toBeInTheDocument()
    })
  })

  describe('Display', () => {
    it('should display timestamps for commands', async () => {
      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...')
      await user.type(input, 'date{Enter}')

      await waitFor(() => {
        // Check for time format (e.g., "10:30:45 AM")
        expect(screen.getByText(/\d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument()
      })
    })

    it('should apply correct styling for error output', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: 'Error output', status: 'error' }),
      })

      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...')
      await user.type(input, 'error-command{Enter}')

      await waitFor(() => {
        const errorOutput = screen.getByText('Error output')
        expect(errorOutput).toHaveClass('text-red-400')
      })
    })

    it('should apply correct styling for success output', async () => {
      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      const input = screen.getByPlaceholderText('Enter command...')
      await user.type(input, 'success-command{Enter}')

      await waitFor(() => {
        const output = screen.getByText('Command executed successfully')
        expect(output).toHaveClass('text-stone-300')
      })
    })
  })

  describe('Layout and Styling', () => {
    it('should apply correct classes for collapsed state', () => {
      const { rerender } = render(<DevKitConsole {...defaultProps} collapsed={false} />)

      // Find the main container with the height classes
      const container = screen.getByText('DevKit Console').closest('div')?.parentElement?.parentElement
      expect(container).toHaveClass('h-80')

      rerender(<DevKitConsole {...defaultProps} collapsed={true} />)

      expect(container).toHaveClass('h-12')
    })

    it('should have scrollable output area', () => {
      render(<DevKitConsole {...defaultProps} />)

      const outputArea = screen.getByPlaceholderText('Enter command...').closest('div')?.parentElement?.previousSibling
      expect(outputArea).toHaveClass('overflow-y-auto', 'scrollbar-thin')
    })
  })

  describe('Auto-scroll', () => {
    it('should auto-scroll to bottom when new output is added', async () => {
      const user = userEvent.setup()
      render(<DevKitConsole {...defaultProps} />)

      // Mock scrollTop and scrollHeight
      const scrollContainer = screen.getByPlaceholderText('Enter command...').closest('div')?.parentElement?.previousSibling as HTMLElement
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000, writable: true })
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 0, writable: true })

      const input = screen.getByPlaceholderText('Enter command...')
      await user.type(input, 'test{Enter}')

      await waitFor(() => {
        expect(scrollContainer.scrollTop).toBe(1000)
      })
    })
  })
})