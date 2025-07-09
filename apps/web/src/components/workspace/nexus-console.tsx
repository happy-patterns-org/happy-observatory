'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Terminal,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  ExternalLink,
  Settings,
} from 'lucide-react'
import { ConsoleConfig, type ConsoleConfig as ConsoleConfigType } from '../console-config'

interface NexusConsoleProps {
  collapsed: boolean
  onToggle: () => void
  projectPath?: string
  bearerToken?: string
}

export function NexusConsole({ collapsed, onToggle, projectPath, bearerToken }: NexusConsoleProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<ConsoleConfigType>({
    securityLevel: 'standard',
    theme: 'dark',
    fontSize: 14,
    enableFileAccess: true,
    enableWebSocketPTY: true,
    maxHistorySize: 1000,
    bearerToken: bearerToken,
  })
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const consoleUrl = process.env.NEXT_PUBLIC_NEXUS_CONSOLE_URL || 'http://localhost:3001'

  // Build the console URL with parameters
  const getConsoleUrl = () => {
    const url = new URL(consoleUrl)

    // Add project path if available
    if (projectPath) {
      url.searchParams.set('cwd', projectPath)
    }

    // Add bearer token if available
    if (config.bearerToken) {
      url.searchParams.set('token', config.bearerToken)
    }

    // Add configuration parameters
    url.searchParams.set('mode', 'embedded')
    url.searchParams.set('theme', config.theme)
    url.searchParams.set('security', config.securityLevel)
    url.searchParams.set('fontSize', config.fontSize.toString())
    url.searchParams.set('fileAccess', config.enableFileAccess.toString())
    url.searchParams.set('pty', config.enableWebSocketPTY.toString())

    return url.toString()
  }

  // Handle iframe load events
  useEffect(() => {
    const handleIframeLoad = () => {
      setIsLoading(false)
      setError(null)
    }

    const handleIframeError = () => {
      setIsLoading(false)
      setError('Failed to load console. Is nexus-console running on port 3001?')
    }

    const iframe = iframeRef.current
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad)
      iframe.addEventListener('error', handleIframeError)

      return () => {
        iframe.removeEventListener('load', handleIframeLoad)
        iframe.removeEventListener('error', handleIframeError)
      }
    }
  }, [])

  // Handle messages from the console
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from the console origin
      if (event.origin !== consoleUrl) return

      // Handle console messages
      if (event.data.type === 'console-ready') {
        console.log('Nexus console is ready')
        setIsLoading(false)
      } else if (event.data.type === 'console-error') {
        console.error('Console error:', event.data.error)
        setError(event.data.error)
      } else if (event.data.type === 'file-selected') {
        console.log('File selected in console:', event.data.path)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [consoleUrl])

  // Send commands to the console
  const sendCommand = (command: string) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'execute-command',
          command,
        },
        consoleUrl
      )
    }
  }

  // Send file path to console
  const openFile = (filePath: string) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'open-file',
          path: filePath,
        },
        consoleUrl
      )
    }
  }

  return (
    <div
      className={`
      bg-stone-900 border-t border-stone-800 transition-all duration-300 ease-in-out
      ${collapsed ? 'h-12' : isFullscreen ? 'fixed inset-0 z-50' : 'h-96'}
    `}
    >
      {/* Console Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-stone-800 bg-stone-900">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-medium text-stone-300">Nexus Console</span>
          {!collapsed && (
            <>
              <span className="text-xs text-stone-500 ml-2">Powered by nexus-console</span>
              <a
                href={consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-xs text-stone-500 hover:text-stone-300 flex items-center gap-1"
                title="Open in new window"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <>
              <button
                onClick={() => setShowConfig(true)}
                className="p-1 hover:bg-stone-800 rounded transition-colors"
                title="Console settings"
              >
                <Settings className="w-4 h-4 text-stone-400" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1 hover:bg-stone-800 rounded transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-stone-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-stone-400" />
                )}
              </button>
            </>
          )}
          <button
            onClick={onToggle}
            className="p-1 hover:bg-stone-800 rounded transition-colors"
            title={collapsed ? 'Expand console' : 'Collapse console'}
          >
            {collapsed ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </button>
        </div>
      </div>

      {/* Console Content */}
      {!collapsed && (
        <div className="relative h-[calc(100%-3rem)] bg-black">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-400 mx-auto mb-2"></div>
                <p className="text-sm text-stone-400">Loading console...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
              <div className="text-center p-4">
                <Terminal className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-400 mb-2">{error}</p>
                <p className="text-xs text-stone-500">Make sure nexus-console is running with:</p>
                <code className="text-xs bg-stone-800 px-2 py-1 rounded mt-1 inline-block">
                  npm run dev:console
                </code>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={getConsoleUrl()}
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            title="Nexus Console"
          />
        </div>
      )}

      {/* Configuration Modal */}
      {showConfig && (
        <ConsoleConfig
          currentConfig={config}
          onClose={() => setShowConfig(false)}
          onSave={(newConfig) => {
            setConfig(newConfig)
            // Reload iframe with new config
            if (iframeRef.current) {
              iframeRef.current.src = getConsoleUrl()
            }
          }}
        />
      )}
    </div>
  )
}

// Export utility functions for external use
export const nexusConsoleUtils = {
  sendCommand: (command: string) => {
    window.postMessage(
      {
        type: 'nexus-console-command',
        command,
      },
      '*'
    )
  },

  openFile: (path: string) => {
    window.postMessage(
      {
        type: 'nexus-console-open-file',
        path,
      },
      '*'
    )
  },
}
