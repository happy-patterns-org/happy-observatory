import { vi } from 'vitest'
import { render, screen, setupComponentTest, waitFor } from '@/test-utils/component-test'
import userEvent from '@testing-library/user-event'
import { NexusConsole, nexusConsoleUtils } from '../nexus-console'
import { act } from '@testing-library/react'

// Mock the config adapter
vi.mock('@/config-adapter', () => ({
  default: {
    nexusConsoleUrl: 'http://localhost:3001',
  },
}))

// Mock the logger
vi.mock('@/lib/logger-client', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock the ConsoleConfig component
vi.mock('../../console-config', () => ({
  ConsoleConfig: ({ onClose, onSave, currentConfig }: any) => (
    <div data-testid="console-config-modal">
      <h2>Console Configuration</h2>
      <button onClick={onClose}>Close</button>
      <button 
        onClick={() => {
          onSave({ ...currentConfig, theme: 'light' })
          onClose()
        }}
      >
        Save
      </button>
    </div>
  ),
}))

// Mock the lazy loaded integration component
vi.mock('../nexus-console-integration', () => ({
  NexusConsoleIntegration: ({ collapsed, onToggle }: any) => (
    <div data-testid="nexus-console-integration">
      Nexus Console Integration
      <button onClick={onToggle}>Toggle Integration</button>
    </div>
  ),
}))

describe('NexusConsole', () => {
  const mockOnToggle = vi.fn()

  const defaultProps = {
    collapsed: false,
    onToggle: mockOnToggle,
  }

  beforeEach(() => {
    setupComponentTest()
    vi.clearAllMocks()
    // Clear localStorage
    localStorage.clear()
  })

  describe('Rendering', () => {
    it('should render console header with correct elements', () => {
      render(<NexusConsole {...defaultProps} />)

      expect(screen.getByText('Nexus Console')).toBeInTheDocument()
      expect(screen.getByText('Powered by nexus-console')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /open in new window/i })).toBeInTheDocument()
    })

    it('should render console in collapsed state', () => {
      render(<NexusConsole {...defaultProps} collapsed={true} />)

      expect(screen.getByText('Nexus Console')).toBeInTheDocument()
      expect(screen.queryByText('Powered by nexus-console')).not.toBeInTheDocument()
      expect(screen.queryByTestId('console-config-modal')).not.toBeInTheDocument()
    })

    it('should render loading state initially', () => {
      render(<NexusConsole {...defaultProps} />)

      expect(screen.getByText('Loading console...')).toBeInTheDocument()
    })

    it('should render iframe with correct attributes', () => {
      render(<NexusConsole {...defaultProps} />)

      const iframe = screen.getByTitle('Nexus Console') as HTMLIFrameElement
      expect(iframe).toBeInTheDocument()
      expect(iframe.src).toContain('http://localhost:3001')
      expect(iframe.src).toContain('mode=embedded')
      expect(iframe.src).toContain('theme=dark')
      expect(iframe.src).toContain('security=standard')
    })

    it('should include project path in iframe URL when provided', () => {
      render(<NexusConsole {...defaultProps} projectPath="/test/project" />)

      const iframe = screen.getByTitle('Nexus Console') as HTMLIFrameElement
      expect(iframe.src).toContain('cwd=%2Ftest%2Fproject')
    })

    it('should include bearer token in iframe URL when provided', () => {
      render(<NexusConsole {...defaultProps} bearerToken="test-token-123" />)

      const iframe = screen.getByTitle('Nexus Console') as HTMLIFrameElement
      expect(iframe.src).toContain('token=test-token-123')
    })

    it('should use token from localStorage if no bearerToken prop', () => {
      localStorage.setItem('token', 'stored-token-456')
      render(<NexusConsole {...defaultProps} />)

      const iframe = screen.getByTitle('Nexus Console') as HTMLIFrameElement
      expect(iframe.src).toContain('token=stored-token-456')
    })
  })

  describe('Interactions', () => {
    it('should toggle collapsed state when toggle button is clicked', async () => {
      const user = userEvent.setup()
      render(<NexusConsole {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /collapse console/i })
      await user.click(toggleButton)

      expect(mockOnToggle).toHaveBeenCalledTimes(1)
    })

    it('should show correct toggle button title based on state', () => {
      const { rerender } = render(<NexusConsole {...defaultProps} collapsed={false} />)

      expect(screen.getByRole('button', { name: /collapse console/i })).toBeInTheDocument()

      rerender(<NexusConsole {...defaultProps} collapsed={true} />)

      expect(screen.getByRole('button', { name: /expand console/i })).toBeInTheDocument()
    })

    it('should toggle fullscreen mode', async () => {
      const user = userEvent.setup()
      render(<NexusConsole {...defaultProps} />)

      const fullscreenButton = screen.getByRole('button', { name: /enter fullscreen/i })
      await user.click(fullscreenButton)

      // Check if the main container has fullscreen classes
      const container = screen.getByText('Nexus Console').closest('div')?.parentElement?.parentElement
      expect(container).toHaveClass('fixed', 'inset-0', 'z-50')

      // Button should now say exit fullscreen
      expect(screen.getByRole('button', { name: /exit fullscreen/i })).toBeInTheDocument()
    })

    it('should open external link in new tab', () => {
      render(<NexusConsole {...defaultProps} />)

      const link = screen.getByRole('link', { name: /open in new window/i })
      expect(link).toHaveAttribute('href', 'http://localhost:3001')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should show configuration modal when settings button is clicked', async () => {
      const user = userEvent.setup()
      render(<NexusConsole {...defaultProps} />)

      const settingsButton = screen.getByRole('button', { name: /console settings/i })
      await user.click(settingsButton)

      expect(screen.getByTestId('console-config-modal')).toBeInTheDocument()
    })

    it('should close configuration modal', async () => {
      const user = userEvent.setup()
      render(<NexusConsole {...defaultProps} />)

      // Open modal
      const settingsButton = screen.getByRole('button', { name: /console settings/i })
      await user.click(settingsButton)

      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(screen.queryByTestId('console-config-modal')).not.toBeInTheDocument()
    })

    it('should save configuration and reload iframe', async () => {
      const user = userEvent.setup()
      render(<NexusConsole {...defaultProps} />)

      const iframe = screen.getByTitle('Nexus Console') as HTMLIFrameElement
      const originalSrc = iframe.src

      // Open modal
      const settingsButton = screen.getByRole('button', { name: /console settings/i })
      await user.click(settingsButton)

      // Save configuration
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      // Modal should close immediately
      expect(screen.queryByTestId('console-config-modal')).not.toBeInTheDocument()

      // iframe src should be updated
      expect(iframe.src).toContain('theme=light')
    })
  })

  describe('Message Handling', () => {
    it('should handle console-ready message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      render(<NexusConsole {...defaultProps} />)

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          origin: 'http://localhost:3001',
          data: { type: 'console-ready' },
        }))
      })

      expect(consoleSpy).toHaveBeenCalledWith('Nexus console is ready')
      consoleSpy.mockRestore()
    })

    it('should handle console-error message', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      render(<NexusConsole {...defaultProps} />)

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          origin: 'http://localhost:3001',
          data: { type: 'console-error', error: 'Test error' },
        }))
      })

      expect(consoleSpy).toHaveBeenCalledWith('Console error:', 'Test error')
      expect(screen.getByText('Test error')).toBeInTheDocument()
      consoleSpy.mockRestore()
    })

    it('should handle file-selected message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      render(<NexusConsole {...defaultProps} />)

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          origin: 'http://localhost:3001',
          data: { type: 'file-selected', path: '/test/file.js' },
        }))
      })

      expect(consoleSpy).toHaveBeenCalledWith('File selected in console:', '/test/file.js')
      consoleSpy.mockRestore()
    })

    it('should ignore messages from different origins', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      render(<NexusConsole {...defaultProps} />)

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          origin: 'http://evil-site.com',
          data: { type: 'console-ready' },
        }))
      })

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Iframe Events', () => {
    it('should handle iframe load event', async () => {
      render(<NexusConsole {...defaultProps} />)

      const iframe = screen.getByTitle('Nexus Console') as HTMLIFrameElement

      // Simulate iframe load
      act(() => {
        iframe.dispatchEvent(new Event('load'))
      })

      await waitFor(() => {
        expect(screen.queryByText('Loading console...')).not.toBeInTheDocument()
      })
    })

    it('should handle iframe error event', async () => {
      render(<NexusConsole {...defaultProps} />)

      const iframe = screen.getByTitle('Nexus Console') as HTMLIFrameElement

      // Simulate iframe error
      act(() => {
        iframe.dispatchEvent(new Event('error'))
      })

      await waitFor(() => {
        expect(screen.getByText('Failed to load console. Is nexus-console running on port 3001?')).toBeInTheDocument()
        expect(screen.getByText('npm run dev:console')).toBeInTheDocument()
      })
    })
  })

  describe('Utility Functions', () => {
    it('should send command via postMessage', () => {
      const postMessageSpy = vi.spyOn(window, 'postMessage')

      nexusConsoleUtils.sendCommand('ls -la')

      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'nexus-console-command',
          command: 'ls -la',
        },
        '*'
      )

      postMessageSpy.mockRestore()
    })

    it('should send open file command via postMessage', () => {
      const postMessageSpy = vi.spyOn(window, 'postMessage')

      nexusConsoleUtils.openFile('/test/file.js')

      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'nexus-console-open-file',
          path: '/test/file.js',
        },
        '*'
      )

      postMessageSpy.mockRestore()
    })
  })

  describe('Layout and Styling', () => {
    it('should apply correct classes for collapsed state', () => {
      const { rerender } = render(<NexusConsole {...defaultProps} collapsed={false} />)

      // Find the main container that has the height classes
      let mainContainer = screen.getByText('Nexus Console').closest('div')?.parentElement?.parentElement
      expect(mainContainer).toHaveClass('h-96')

      rerender(<NexusConsole {...defaultProps} collapsed={true} />)

      mainContainer = screen.getByText('Nexus Console').closest('div')?.parentElement?.parentElement
      expect(mainContainer).toHaveClass('h-12')
    })

    it('should apply correct classes for fullscreen state', async () => {
      const user = userEvent.setup()
      render(<NexusConsole {...defaultProps} />)

      const fullscreenButton = screen.getByRole('button', { name: /enter fullscreen/i })
      await user.click(fullscreenButton)

      // Find the main container that has the fullscreen classes
      const mainContainer = screen.getByText('Nexus Console').closest('div')?.parentElement?.parentElement
      expect(mainContainer).toHaveClass('fixed', 'inset-0', 'z-50')
    })

    it('should show all control buttons when expanded', () => {
      render(<NexusConsole {...defaultProps} collapsed={false} />)

      expect(screen.getByRole('button', { name: /console settings/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /enter fullscreen/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /collapse console/i })).toBeInTheDocument()
    })

    it('should only show toggle button when collapsed', () => {
      render(<NexusConsole {...defaultProps} collapsed={true} />)

      expect(screen.queryByRole('button', { name: /console settings/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /enter fullscreen/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /expand console/i })).toBeInTheDocument()
    })
  })

  describe('Configuration', () => {
    it('should build console URL with all config parameters', () => {
      render(<NexusConsole 
        {...defaultProps} 
        projectPath="/my/project"
        bearerToken="my-token"
      />)

      const iframe = screen.getByTitle('Nexus Console') as HTMLIFrameElement
      const url = new URL(iframe.src)

      expect(url.searchParams.get('cwd')).toBe('/my/project')
      expect(url.searchParams.get('token')).toBe('my-token')
      expect(url.searchParams.get('mode')).toBe('embedded')
      expect(url.searchParams.get('theme')).toBe('dark')
      expect(url.searchParams.get('security')).toBe('standard')
      expect(url.searchParams.get('fontSize')).toBe('14')
      expect(url.searchParams.get('fileAccess')).toBe('true')
      expect(url.searchParams.get('pty')).toBe('true')
    })
  })
})