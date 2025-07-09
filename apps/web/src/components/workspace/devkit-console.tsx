'use client'

import { useState, useRef, useEffect } from 'react'
import { Terminal, ChevronUp, ChevronDown, Command, X } from 'lucide-react'

interface DevKitConsoleProps {
  collapsed: boolean
  onToggle: () => void
  mcpConnection?: any
}

interface CommandHistoryItem {
  id: string
  command: string
  output: string
  timestamp: Date
  status: 'success' | 'error' | 'running'
}

export function DevKitConsole({ collapsed, onToggle, mcpConnection }: DevKitConsoleProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<CommandHistoryItem[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history])

  const executeCommand = async (command: string) => {
    if (!command.trim()) return

    const newItem: CommandHistoryItem = {
      id: Date.now().toString(),
      command,
      output: '',
      timestamp: new Date(),
      status: 'running',
    }

    setHistory((prev) => [...prev, newItem])
    setCommandHistory((prev) => [...prev, command])
    setInput('')
    setHistoryIndex(-1)

    // Special case for clear command
    if (command === 'clear') {
      setHistory([])
      return
    }

    try {
      // Execute command via API
      const response = await fetch('/api/console/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          projectPath: window.location.pathname, // Could be improved with actual project path
        }),
      })

      if (response.ok) {
        const data = await response.json()

        setHistory((prev) =>
          prev.map((item) =>
            item.id === newItem.id
              ? {
                  ...item,
                  output: data.output,
                  status: data.status === 'success' ? 'success' : 'error',
                }
              : item
          )
        )
      } else {
        throw new Error('Command execution failed')
      }
    } catch (error) {
      setHistory((prev) =>
        prev.map((item) =>
          item.id === newItem.id ? { ...item, output: `Error: ${error}`, status: 'error' } : item
        )
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  return (
    <div
      className={`
      bg-stone-900 border-t border-stone-800 transition-all duration-300 ease-in-out
      ${collapsed ? 'h-12' : 'h-80'}
    `}
    >
      {/* Console Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-medium text-stone-300">DevKit Console</span>
          {!collapsed && (
            <span className="text-xs text-stone-500 ml-2">
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+` to toggle
            </span>
          )}
        </div>
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

      {/* Console Content */}
      {!collapsed && (
        <div className="flex flex-col h-[calc(100%-3rem)]">
          {/* Output Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 console-text scrollbar-thin">
            {history.map((item) => (
              <div key={item.id} className="mb-4">
                <div className="flex items-center gap-2 text-stone-400">
                  <Command className="w-3 h-3" />
                  <span className="text-green-400">{item.command}</span>
                  <span className="text-xs ml-auto">{item.timestamp.toLocaleTimeString()}</span>
                </div>
                {item.output && (
                  <div
                    className={`mt-1 ml-5 whitespace-pre-wrap ${
                      item.status === 'error' ? 'text-red-400' : 'text-stone-300'
                    }`}
                  >
                    {item.output}
                  </div>
                )}
                {item.status === 'running' && (
                  <div className="mt-1 ml-5 text-yellow-400">Executing...</div>
                )}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="border-t border-stone-800 p-4">
            <div className="flex items-center gap-2">
              <Command className="w-4 h-4 text-stone-500" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command..."
                className="flex-1 bg-transparent text-stone-100 placeholder-stone-600 focus:outline-none font-mono text-sm"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
