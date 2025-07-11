'use client'

import type { ScopeCamMCPConnection } from '@/lib/scopecam/mcp-connection'
import { Send, Terminal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ShellTerminalProps {
  mcpConnection: ScopeCamMCPConnection
  projectName: string
}

interface CommandHistory {
  command: string
  output: string
  timestamp: Date
  status: 'success' | 'error' | 'running'
}

const SCT_COMMANDS = [
  { cmd: 'run', desc: 'Run test suite', example: 'sct run --parallel' },
  { cmd: 'select', desc: 'Select tests to run', example: 'sct select --changed' },
  { cmd: 'analyze', desc: 'Analyze test failures', example: 'sct analyze --last-run' },
  { cmd: 'coverage', desc: 'Show coverage report', example: 'sct coverage --detailed' },
  { cmd: 'guardian', desc: 'Test Guardian control', example: 'sct guardian status' },
  { cmd: 'flaky', desc: 'Manage flaky tests', example: 'sct flaky list' },
  { cmd: 'perf', desc: 'Performance analysis', example: 'sct perf --slow-tests' },
]

export function ShellTerminal({ mcpConnection, projectName }: ShellTerminalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<CommandHistory[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isExecuting, setIsExecuting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  const executeCommand = async () => {
    if (!command.trim() || isExecuting) return

    const trimmedCommand = command.trim()
    const newEntry: CommandHistory = {
      command: trimmedCommand,
      output: '',
      timestamp: new Date(),
      status: 'running',
    }

    setHistory((prev) => [...prev, newEntry])
    setCommand('')
    setIsExecuting(true)
    setHistoryIndex(-1)

    try {
      // Parse command
      const parts = trimmedCommand.split(' ')
      const baseCommand = parts[0]

      // Handle built-in commands
      if (baseCommand === 'clear') {
        setHistory([])
        setIsExecuting(false)
        return
      }

      if (baseCommand === 'help') {
        const helpText = SCT_COMMANDS.map(
          (cmd) => `${cmd.cmd.padEnd(10)} - ${cmd.desc}\n  Example: ${cmd.example}`
        ).join('\n\n')

        setHistory((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...newEntry,
            output: helpText,
            status: 'success',
          }
          return updated
        })
        setIsExecuting(false)
        return
      }

      // Execute via MCP if it's an sct command
      if (baseCommand === 'sct' || SCT_COMMANDS.some((c) => baseCommand === c.cmd)) {
        const fullCommand = baseCommand === 'sct' ? trimmedCommand : `sct ${trimmedCommand}`
        const output = await mcpConnection.executeShellCommand(fullCommand, parts.slice(1))

        setHistory((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...newEntry,
            output,
            status: 'success',
          }
          return updated
        })
      } else {
        setHistory((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...newEntry,
            output: `Command not found: ${baseCommand}\nType 'help' for available commands`,
            status: 'error',
          }
          return updated
        })
      }
    } catch (error) {
      setHistory((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...newEntry,
          output: error instanceof Error ? error.message : 'Command execution failed',
          status: 'error',
        }
        return updated
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setCommand(history[history.length - 1 - newIndex]?.command ?? '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCommand(history[history.length - 1 - newIndex]?.command ?? '')
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCommand('')
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Simple autocomplete
      const currentCmd = command.trim().toLowerCase()
      const matches = SCT_COMMANDS.filter(
        (cmd) => cmd.cmd.startsWith(currentCmd) || `sct ${cmd.cmd}`.startsWith(currentCmd)
      )

      if (matches.length === 1) {
        setCommand(currentCmd.startsWith('sct') ? `sct ${matches[0]?.cmd ?? ''} ` : `${matches[0]?.cmd ?? ''} `)
      } else if (matches.length > 1) {
        setShowSuggestions(true)
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        title="Open ScopeCam Terminal"
      >
        <Terminal className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 right-0 w-full md:w-[600px] h-[400px] bg-stone-900 text-stone-100 rounded-tl-lg shadow-2xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-stone-800 border-b border-stone-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium">ScopeCam Terminal - {projectName}</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-stone-700 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Terminal Content */}
      <div ref={terminalRef} className="h-[calc(100%-80px)] overflow-y-auto p-4 font-mono text-sm">
        {history.length === 0 && (
          <div className="text-stone-500">
            Welcome to ScopeCam Terminal. Type 'help' for available commands.
          </div>
        )}

        {history.map((entry, idx) => (
          <div key={idx} className="mb-4">
            <div className="flex items-start gap-2">
              <span className="text-purple-400">$</span>
              <span className="text-stone-300">{entry.command}</span>
              {entry.status === 'running' && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400 ml-2" />
              )}
            </div>
            {entry.output && (
              <pre
                className={`mt-1 ml-6 ${
                  entry.status === 'error' ? 'text-red-400' : 'text-stone-400'
                } whitespace-pre-wrap`}
              >
                {entry.output}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-stone-800 border-t border-stone-700">
        {showSuggestions && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-stone-700 rounded-md p-2">
            <div className="text-xs text-stone-400 mb-1">Available commands:</div>
            <div className="grid grid-cols-2 gap-1">
              {SCT_COMMANDS.filter((cmd) =>
                cmd.cmd.toLowerCase().includes(command.trim().toLowerCase())
              ).map((cmd) => (
                <button
                  key={cmd.cmd}
                  onClick={() => {
                    setCommand(`sct ${cmd.cmd} `)
                    setShowSuggestions(false)
                    inputRef.current?.focus()
                  }}
                  className="text-left px-2 py-1 text-xs hover:bg-stone-600 rounded"
                >
                  <span className="text-purple-400">{cmd.cmd}</span>
                  <span className="text-stone-500 ml-2">{cmd.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-purple-400">$</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            className="flex-1 bg-transparent outline-none text-stone-100 placeholder-stone-600"
            placeholder="Enter command (type 'help' for commands)"
          />
          <button
            onClick={executeCommand}
            disabled={isExecuting || !command.trim()}
            className="p-1 text-purple-400 hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
