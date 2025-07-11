'use client'

import { useTerminalDiscovery } from '@/hooks/use-terminal-discovery'
// Auth is handled via cookies - no client-side store needed
import { useProjectStore } from '@/store/project-store'
import { AlertCircle, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

// Placeholder until @happy-devkit/nexus-console is published
// For now, we'll use iframe mode
const NexusConsoleComponent = () => (
  <div className="flex items-center justify-center h-full bg-stone-900 text-stone-400 p-8">
    <div className="text-center">
      <AlertCircle className="w-8 h-8 mx-auto mb-4" />
      <p className="text-sm mb-2">Nexus Console package not yet available</p>
      <p className="text-xs">Please use iframe mode for now</p>
    </div>
  </div>
)

interface NexusConsoleIntegrationProps {
  collapsed: boolean
  onToggle: () => void
}

export function NexusConsoleIntegration({ collapsed, onToggle }: NexusConsoleIntegrationProps) {
  const { selectedProject } = useProjectStore()
  const [height, setHeight] = useState(collapsed ? 40 : 200)
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light')
  const [connectionStatus] = useState<'connecting' | 'connected' | 'error'>(
    'connecting'
  )

  // Use terminal discovery for enhanced features
  const { getBestEndpoint, fetchMetrics } = useTerminalDiscovery(
    selectedProject?.id
  )

  const terminalEndpoint = getBestEndpoint('local')

  // Update height when collapsed state changes
  useEffect(() => {
    setHeight(collapsed ? 40 : 200)
  }, [collapsed])

  // Handle theme detection
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleThemeChange = () => {
      if (theme === 'auto') {
        // Force re-render with system theme
        setTheme(mediaQuery.matches ? 'dark' : 'light')
        setTimeout(() => setTheme('auto'), 0)
      }
    }

    mediaQuery.addEventListener('change', handleThemeChange)
    return () => mediaQuery.removeEventListener('change', handleThemeChange)
  }, [theme])



  const handleResize = (newHeight: number) => {
    // Constrain height between min and max
    const constrainedHeight = Math.max(40, Math.min(600, newHeight))
    setHeight(constrainedHeight)

    // If user drags to minimum height, consider it collapsed
    if (constrainedHeight <= 50 && !collapsed) {
      onToggle()
    } else if (constrainedHeight > 50 && collapsed) {
      onToggle()
    }
  }

  // Authentication is handled server-side, no need to check token here

  // Periodic metrics refresh
  useEffect(() => {
    if (!terminalEndpoint || connectionStatus !== 'connected') return

    const interval = setInterval(() => {
      fetchMetrics(terminalEndpoint.id)
    }, 30000) // Every 30s

    return () => clearInterval(interval)
  }, [terminalEndpoint, connectionStatus, fetchMetrics])

  return (
    <div className="relative">
      {/* Connection status indicator */}
      {connectionStatus === 'error' && terminalEndpoint && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-red-900/80 text-red-200 px-2 py-1 rounded text-xs">
          <WifiOff className="w-3 h-3" />
          <span>Terminal disconnected</span>
        </div>
      )}
      <NexusConsoleComponent />

      {/* Resize handle */}
      {!collapsed && (
        <div
          className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500/20 transition-colors"
          onMouseDown={(e) => {
            const startY = e.clientY
            const startHeight = height

            const handleMouseMove = (e: MouseEvent) => {
              const deltaY = startY - e.clientY
              handleResize(startHeight + deltaY)
            }

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />
      )}
    </div>
  )
}
