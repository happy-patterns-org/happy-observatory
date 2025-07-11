import { vi } from 'vitest'
import { render, screen } from '@/test-utils/component-test'
import userEvent from '@testing-library/user-event'
import { WorkspaceMode } from '../workspace-mode'

describe('WorkspaceMode', () => {
  const mockOnModeChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all four operating modes', () => {
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      expect(screen.getByText('Operating Mode')).toBeInTheDocument()
      expect(screen.getByText('Observe')).toBeInTheDocument()
      expect(screen.getByText('Guide')).toBeInTheDocument()
      expect(screen.getByText('Collaborate')).toBeInTheDocument()
      expect(screen.getByText('Autonomous')).toBeInTheDocument()
    })

    it('should display mode descriptions', () => {
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      expect(screen.getByText('Monitor agent activity and system metrics')).toBeInTheDocument()
      expect(screen.getByText('Direct and guide agent operations')).toBeInTheDocument()
      expect(screen.getByText('Work alongside agents on tasks')).toBeInTheDocument()
      expect(screen.getByText('Agents operate independently')).toBeInTheDocument()
    })

    it('should show keyboard shortcuts', () => {
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      expect(screen.getByText('⌘1')).toBeInTheDocument()
      expect(screen.getByText('⌘2')).toBeInTheDocument()
      expect(screen.getByText('⌘3')).toBeInTheDocument()
      expect(screen.getByText('⌘4')).toBeInTheDocument()
    })

    it('should show platform-specific shortcut hint for Mac', () => {
      const originalPlatform = navigator.platform
      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: 'MacIntel'
      })

      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)
      
      expect(screen.getByText('Use ⌘+1-4 to switch modes')).toBeInTheDocument()

      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: originalPlatform
      })
    })

    it('should show platform-specific shortcut hint for non-Mac', () => {
      const originalPlatform = navigator.platform
      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: 'Win32'
      })

      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)
      
      expect(screen.getByText('Use Ctrl+1-4 to switch modes')).toBeInTheDocument()

      Object.defineProperty(navigator, 'platform', {
        writable: true,
        value: originalPlatform
      })
    })
  })

  describe('Visual States', () => {
    it('should highlight the current mode', () => {
      const { rerender } = render(
        <WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />
      )

      const observeButton = screen.getByRole('button', { name: /Observe.*Monitor agent activity/s })
      expect(observeButton).toHaveClass('border-stone-900', 'bg-stone-50')

      // Change mode and verify highlight moves
      rerender(<WorkspaceMode currentMode="guide" onModeChange={mockOnModeChange} />)
      
      const guideButton = screen.getByRole('button', { name: /Guide.*Direct and guide agent/s })
      expect(guideButton).toHaveClass('border-stone-900', 'bg-stone-50')
      expect(observeButton).not.toHaveClass('border-stone-900')
    })

    it('should apply correct gradient colors for each mode', () => {
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      const buttons = screen.getAllByRole('button')
      const gradientDivs = buttons.map(btn => btn.querySelector('.bg-gradient-to-br'))

      expect(gradientDivs[0]).toHaveClass('from-dawn-400', 'to-dawn-600')
      expect(gradientDivs[1]).toHaveClass('from-morning-400', 'to-morning-600')
      expect(gradientDivs[2]).toHaveClass('from-noon-400', 'to-noon-600')
      expect(gradientDivs[3]).toHaveClass('from-twilight-400', 'to-twilight-600')
    })

    it('should show active indicator bar for current mode', () => {
      render(<WorkspaceMode currentMode="collaborate" onModeChange={mockOnModeChange} />)

      const collaborateButton = screen.getByRole('button', { name: /Collaborate.*Work alongside/s })
      const indicator = collaborateButton.querySelector('.absolute.inset-x-0.bottom-0')
      
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveClass('bg-gradient-to-r')
    })

    it('should apply glow effect to current mode icon', () => {
      render(<WorkspaceMode currentMode="autonomous" onModeChange={mockOnModeChange} />)

      const autonomousButton = screen.getByRole('button', { name: /Autonomous.*Agents operate/s })
      const iconContainer = autonomousButton.querySelector('.nexus-pulse')
      
      expect(iconContainer).toBeInTheDocument()
      expect(iconContainer).toHaveClass('autonomous-glow')
    })
  })

  describe('Interactions', () => {
    it('should call onModeChange when clicking a mode', async () => {
      const user = userEvent.setup()
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      const guideButton = screen.getByRole('button', { name: /Guide.*Direct and guide agent/s })
      await user.click(guideButton)

      expect(mockOnModeChange).toHaveBeenCalledWith('guide')
      expect(mockOnModeChange).toHaveBeenCalledTimes(1)
    })

    it('should call onModeChange for each mode', async () => {
      const user = userEvent.setup()
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      const modes = ['observe', 'guide', 'collaborate', 'autonomous'] as const
      const buttons = screen.getAllByRole('button')

      for (let i = 0; i < modes.length; i++) {
        await user.click(buttons[i])
        expect(mockOnModeChange).toHaveBeenLastCalledWith(modes[i])
      }

      expect(mockOnModeChange).toHaveBeenCalledTimes(4)
    })

    it('should allow clicking the currently active mode', async () => {
      const user = userEvent.setup()
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      const observeButton = screen.getByRole('button', { name: /Observe.*Monitor agent activity/s })
      await user.click(observeButton)

      expect(mockOnModeChange).toHaveBeenCalledWith('observe')
    })
  })

  describe('Hover States', () => {
    it('should apply hover styles to non-active modes', async () => {
      const user = userEvent.setup()
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      const guideButton = screen.getByRole('button', { name: /Guide.*Direct and guide agent/s })
      
      // Check initial state
      expect(guideButton).toHaveClass('border-stone-200')
      
      // Hover over button
      await user.hover(guideButton)
      
      // Note: hover classes are applied via CSS, so we check for the hover classes in the className
      expect(guideButton).toHaveClass('hover:border-stone-400', 'hover:bg-stone-50')
    })

    it('should scale icon on hover for non-active modes', async () => {
      const user = userEvent.setup()
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      const collaborateButton = screen.getByRole('button', { name: /Collaborate.*Work alongside/s })
      const iconContainer = collaborateButton.querySelector('.bg-gradient-to-br')
      
      expect(iconContainer).toHaveClass('group-hover:scale-105')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      const buttons = screen.getAllByRole('button')
      
      expect(buttons[0]).toHaveAccessibleName(/Observe.*Monitor agent activity/s)
      expect(buttons[1]).toHaveAccessibleName(/Guide.*Direct and guide agent/s)
      expect(buttons[2]).toHaveAccessibleName(/Collaborate.*Work alongside/s)
      expect(buttons[3]).toHaveAccessibleName(/Autonomous.*Agents operate/s)
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      // Tab through all buttons
      await user.tab()
      expect(screen.getByRole('button', { name: /Observe/s })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /Guide/s })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /Collaborate/s })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /Autonomous/s })).toHaveFocus()
    })

    it('should activate modes with Enter key', async () => {
      const user = userEvent.setup()
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      await user.tab() // Focus first button
      await user.tab() // Focus second button (Guide)
      await user.keyboard('{Enter}')

      expect(mockOnModeChange).toHaveBeenCalledWith('guide')
    })

    it('should activate modes with Space key', async () => {
      const user = userEvent.setup()
      render(<WorkspaceMode currentMode="observe" onModeChange={mockOnModeChange} />)

      await user.tab() // Focus first button
      await user.tab() // Focus second button
      await user.tab() // Focus third button (Collaborate)
      await user.keyboard(' ') // Space key

      expect(mockOnModeChange).toHaveBeenCalledWith('collaborate')
    })
  })
})