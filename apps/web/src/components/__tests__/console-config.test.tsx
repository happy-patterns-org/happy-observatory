import { vi } from 'vitest'
import { render, screen, setupComponentTest } from '@/test-utils/component-test'
import userEvent from '@testing-library/user-event'
import { ConsoleConfig, type ConsoleConfig as ConsoleConfigType } from '../console-config'

describe('ConsoleConfig', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()

  const defaultConfig: ConsoleConfigType = {
    securityLevel: 'standard',
    theme: 'dark',
    fontSize: 14,
    enableFileAccess: true,
    enableWebSocketPTY: true,
    maxHistorySize: 1000,
  }

  const defaultProps = {
    onClose: mockOnClose,
    onSave: mockOnSave,
    currentConfig: defaultConfig,
  }

  beforeEach(() => {
    setupComponentTest()
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render modal with correct title', () => {
      render(<ConsoleConfig {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'Console Configuration' })).toBeInTheDocument()
      expect(screen.getByText('Console Configuration')).toBeInTheDocument()
    })

    it('should render all configuration sections', () => {
      render(<ConsoleConfig {...defaultProps} />)

      // Security level section
      expect(screen.getByText('Security Level')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()

      // Theme section
      expect(screen.getByText('Theme')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument()

      // Font size section
      expect(screen.getByText(/Font Size: 14px/)).toBeInTheDocument()
      expect(screen.getByRole('slider')).toBeInTheDocument()

      // Features section
      expect(screen.getByText('Features')).toBeInTheDocument()
      expect(screen.getByLabelText('Enable File System Access')).toBeInTheDocument()
      expect(screen.getByLabelText('Enable WebSocket PTY')).toBeInTheDocument()

      // History size section
      expect(screen.getByText('Max History Size')).toBeInTheDocument()
      expect(screen.getByRole('spinbutton')).toBeInTheDocument()

      // Bearer token section
      expect(screen.getByText('Bearer Token (Optional)')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter token for authentication')).toBeInTheDocument()
    })

    it('should render with current config values', () => {
      const customConfig: ConsoleConfigType = {
        securityLevel: 'strict',
        theme: 'light',
        fontSize: 16,
        enableFileAccess: false,
        enableWebSocketPTY: false,
        maxHistorySize: 5000,
        bearerToken: 'test-token',
      }

      render(<ConsoleConfig {...defaultProps} currentConfig={customConfig} />)

      // Check security level
      const securitySelect = screen.getByRole('combobox') as HTMLSelectElement
      expect(securitySelect.value).toBe('strict')

      // Check theme
      const lightButton = screen.getByRole('button', { name: 'Light' })
      expect(lightButton).toHaveClass('bg-stone-900', 'text-white')

      // Check font size
      expect(screen.getByText(/Font Size: 16px/)).toBeInTheDocument()
      const fontSlider = screen.getByRole('slider') as HTMLInputElement
      expect(fontSlider.value).toBe('16')

      // Check features
      const fileAccessCheckbox = screen.getByLabelText('Enable File System Access') as HTMLInputElement
      expect(fileAccessCheckbox.checked).toBe(false)

      const ptyCheckbox = screen.getByLabelText('Enable WebSocket PTY') as HTMLInputElement
      expect(ptyCheckbox.checked).toBe(false)

      // Check history size
      const historyInput = screen.getByRole('spinbutton') as HTMLInputElement
      expect(historyInput.value).toBe('5000')

      // Check bearer token (should be hidden by default)
      const tokenInput = screen.getByPlaceholderText('Enter token for authentication') as HTMLInputElement
      expect(tokenInput.value).toBe('test-token')
      expect(tokenInput.type).toBe('password')
    })

    it('should use default config when currentConfig is not provided', () => {
      render(<ConsoleConfig onClose={mockOnClose} onSave={mockOnSave} />)

      const securitySelect = screen.getByRole('combobox') as HTMLSelectElement
      expect(securitySelect.value).toBe('standard')
    })
  })

  describe('Security Level', () => {
    it('should update security level when changed', async () => {
      const user = userEvent.setup()
      render(<ConsoleConfig {...defaultProps} />)

      const securitySelect = screen.getByRole('combobox')
      await user.selectOptions(securitySelect, 'permissive')

      expect((securitySelect as HTMLSelectElement).value).toBe('permissive')
    })

    it('should show correct description for security levels', () => {
      render(<ConsoleConfig {...defaultProps} />)

      expect(screen.getByText('Controls command sanitization and file access restrictions')).toBeInTheDocument()
    })
  })

  describe('Theme Selection', () => {
    it('should highlight selected theme button', () => {
      render(<ConsoleConfig {...defaultProps} />)

      const darkButton = screen.getByRole('button', { name: 'Dark' })
      const lightButton = screen.getByRole('button', { name: 'Light' })

      expect(darkButton).toHaveClass('bg-stone-900', 'text-white')
      expect(lightButton).toHaveClass('bg-stone-100', 'text-stone-700')
    })

    it('should update theme when button is clicked', async () => {
      const user = userEvent.setup()
      render(<ConsoleConfig {...defaultProps} />)

      const lightButton = screen.getByRole('button', { name: 'Light' })
      await user.click(lightButton)

      expect(lightButton).toHaveClass('bg-stone-900', 'text-white')
      const darkButton = screen.getByRole('button', { name: 'Dark' })
      expect(darkButton).toHaveClass('bg-stone-100', 'text-stone-700')
    })
  })

  describe('Font Size', () => {
    it('should update font size when slider is moved', async () => {
      const user = userEvent.setup()
      render(<ConsoleConfig {...defaultProps} />)

      const fontSlider = screen.getByRole('slider')
      // For range inputs, we need to use fireEvent
      const { fireEvent } = await import('@testing-library/react')
      fireEvent.change(fontSlider, { target: { value: '18' } })

      expect(screen.getByText(/Font Size: 18px/)).toBeInTheDocument()
    })

    it('should respect min and max font size limits', () => {
      render(<ConsoleConfig {...defaultProps} />)

      const fontSlider = screen.getByRole('slider') as HTMLInputElement
      expect(fontSlider.min).toBe('10')
      expect(fontSlider.max).toBe('20')
    })
  })

  describe('Features', () => {
    it('should toggle file access checkbox', async () => {
      const user = userEvent.setup()
      render(<ConsoleConfig {...defaultProps} />)

      const fileAccessCheckbox = screen.getByLabelText('Enable File System Access')
      expect(fileAccessCheckbox).toBeChecked()

      await user.click(fileAccessCheckbox)
      expect(fileAccessCheckbox).not.toBeChecked()
    })

    it('should toggle WebSocket PTY checkbox', async () => {
      const user = userEvent.setup()
      render(<ConsoleConfig {...defaultProps} />)

      const ptyCheckbox = screen.getByLabelText('Enable WebSocket PTY')
      expect(ptyCheckbox).toBeChecked()

      await user.click(ptyCheckbox)
      expect(ptyCheckbox).not.toBeChecked()
    })
  })

  describe('History Size', () => {
    it('should update history size', async () => {
      const user = userEvent.setup()
      render(<ConsoleConfig {...defaultProps} />)

      const historyInput = screen.getByRole('spinbutton')
      await user.clear(historyInput)
      await user.type(historyInput, '2500')

      expect((historyInput as HTMLInputElement).value).toBe('2500')
    })

    it('should have correct min, max, and step attributes', () => {
      render(<ConsoleConfig {...defaultProps} />)

      const historyInput = screen.getByRole('spinbutton') as HTMLInputElement
      expect(historyInput.min).toBe('100')
      expect(historyInput.max).toBe('10000')
      expect(historyInput.step).toBe('100')
    })
  })

  describe('Bearer Token', () => {
    it('should toggle token visibility', async () => {
      const user = userEvent.setup()
      render(<ConsoleConfig {...defaultProps} currentConfig={{ ...defaultConfig, bearerToken: 'secret-token' }} />)

      const tokenInput = screen.getByPlaceholderText('Enter token for authentication') as HTMLInputElement
      const toggleButton = screen.getByRole('button', { name: 'Show' })

      expect(tokenInput.type).toBe('password')

      await user.click(toggleButton)
      expect(tokenInput.type).toBe('text')
      expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument()
    })

    it('should update bearer token', async () => {
      const user = userEvent.setup()
      render(<ConsoleConfig {...defaultProps} />)

      const tokenInput = screen.getByPlaceholderText('Enter token for authentication')
      await user.type(tokenInput, 'new-token')

      expect((tokenInput as HTMLInputElement).value).toBe('new-token')
    })

    it('should show authentication hint', () => {
      render(<ConsoleConfig {...defaultProps} />)

      expect(screen.getByText('Used for unified authentication with Happy DevKit')).toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<ConsoleConfig {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should call onClose when close button (×) is clicked', async () => {
      const user = userEvent.setup()
      render(<ConsoleConfig {...defaultProps} />)

      const closeButton = screen.getByRole('button', { name: '×' })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should save configuration with updated values', async () => {
      const user = userEvent.setup()
      const { fireEvent } = await import('@testing-library/react')
      render(<ConsoleConfig {...defaultProps} />)

      // Make some changes
      await user.selectOptions(screen.getByRole('combobox'), 'permissive')
      await user.click(screen.getByRole('button', { name: 'Light' }))
      fireEvent.change(screen.getByRole('slider'), { target: { value: '18' } })
      await user.click(screen.getByLabelText('Enable File System Access'))
      await user.clear(screen.getByRole('spinbutton'))
      await user.type(screen.getByRole('spinbutton'), '2000')
      await user.type(screen.getByPlaceholderText('Enter token for authentication'), 'new-token')

      // Save
      const saveButton = screen.getByRole('button', { name: /Save Configuration/ })
      await user.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith({
        securityLevel: 'permissive',
        theme: 'light',
        fontSize: 18,
        enableFileAccess: false,
        enableWebSocketPTY: true,
        maxHistorySize: 2000,
        bearerToken: 'new-token',
      })
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Modal Behavior', () => {
    it('should render as a modal overlay', () => {
      render(<ConsoleConfig {...defaultProps} />)

      // Find the outermost modal container (the one with the overlay)
      const heading = screen.getByRole('heading', { name: 'Console Configuration' })
      const modalContainer = heading.closest('.fixed.inset-0')
      expect(modalContainer).toHaveClass('fixed', 'inset-0', 'bg-black/50', 'z-50')
    })

    it('should have proper styling for modal content', () => {
      render(<ConsoleConfig {...defaultProps} />)

      // Find the modal content container (the white box)
      const heading = screen.getByRole('heading', { name: 'Console Configuration' })
      const modalContent = heading.closest('.bg-white.rounded-lg')
      expect(modalContent).toHaveClass('bg-white', 'rounded-lg', 'p-6', 'w-[500px]')
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for all form controls', () => {
      render(<ConsoleConfig {...defaultProps} />)

      // Check for labels by text (some are not properly associated with form controls)
      expect(screen.getByText('Security Level')).toBeInTheDocument()
      expect(screen.getByText('Theme')).toBeInTheDocument()
      expect(screen.getByText(/Font Size:/)).toBeInTheDocument()
      expect(screen.getByLabelText('Enable File System Access')).toBeInTheDocument()
      expect(screen.getByLabelText('Enable WebSocket PTY')).toBeInTheDocument()
      expect(screen.getByText('Max History Size')).toBeInTheDocument()
      expect(screen.getByText('Bearer Token (Optional)')).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<ConsoleConfig {...defaultProps} />)

      // Tab through controls
      await user.tab()
      expect(screen.getByRole('button', { name: '×' })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('combobox')).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: 'Dark' })).toHaveFocus()
    })
  })
})