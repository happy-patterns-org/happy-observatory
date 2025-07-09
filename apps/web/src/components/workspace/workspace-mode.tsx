'use client'

import { Eye, Compass, Users, Zap } from 'lucide-react'

type OperatingMode = 'observe' | 'guide' | 'collaborate' | 'autonomous'

interface WorkspaceModeProps {
  currentMode: OperatingMode
  onModeChange: (mode: OperatingMode) => void
}

export function WorkspaceMode({ currentMode, onModeChange }: WorkspaceModeProps) {
  const modes = [
    {
      id: 'observe' as const,
      label: 'Observe',
      icon: Eye,
      description: 'Monitor agent activity and system metrics',
      color: 'from-dawn-400 to-dawn-600',
      shortcut: '⌘1',
    },
    {
      id: 'guide' as const,
      label: 'Guide',
      icon: Compass,
      description: 'Direct and guide agent operations',
      color: 'from-morning-400 to-morning-600',
      shortcut: '⌘2',
    },
    {
      id: 'collaborate' as const,
      label: 'Collaborate',
      icon: Users,
      description: 'Work alongside agents on tasks',
      color: 'from-noon-400 to-noon-600',
      shortcut: '⌘3',
    },
    {
      id: 'autonomous' as const,
      label: 'Autonomous',
      icon: Zap,
      description: 'Agents operate independently',
      color: 'from-twilight-400 to-twilight-600',
      shortcut: '⌘4',
    },
  ]

  return (
    <div className="bg-white border-b border-stone-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-900">Operating Mode</h2>
        <div className="text-xs text-stone-500">
          Use {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+1-4 to switch modes
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`
              relative group p-4 rounded-lg border-2 transition-all duration-200
              ${
                currentMode === mode.id
                  ? 'border-stone-900 bg-stone-50'
                  : 'border-stone-200 hover:border-stone-400 hover:bg-stone-50'
              }
            `}
          >
            <div
              className={`
              w-12 h-12 mx-auto mb-3 rounded-lg bg-gradient-to-br ${mode.color}
              flex items-center justify-center transition-transform duration-200
              ${currentMode === mode.id ? 'scale-110 nexus-pulse' : 'group-hover:scale-105'}
              ${currentMode === mode.id ? mode.id + '-glow' : ''}
            `}
            >
              <mode.icon className="w-6 h-6 text-white" />
            </div>

            <h3 className="font-medium text-stone-900">{mode.label}</h3>
            <p className="text-xs text-stone-600 mt-1">{mode.description}</p>

            <div className="absolute top-2 right-2 text-xs text-stone-400">{mode.shortcut}</div>

            {currentMode === mode.id && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-stone-600 to-transparent" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
