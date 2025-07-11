'use client'

import { Activity, BarChart3, GitBranch, LayoutDashboard, Settings, Terminal } from 'lucide-react'
import type { ReactNode } from 'react'
import { ProjectChooser } from './project-chooser'

interface DashboardLayoutProps {
  children: ReactNode
  sidebar?: ReactNode
}

export function DashboardLayout({ children, sidebar }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-stone-workspace flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-stone-600" />
              <h1 className="text-xl font-semibold text-stone-900">Happy Observatory</h1>
            </div>
            <span className="text-sm text-stone-500">Agentic Development Control Center</span>
          </div>

          <div className="flex items-center gap-4">
            <ProjectChooser />
            <button type="button" className="p-2 hover:bg-stone-100 rounded-md transition-colors">
              <Settings className="w-5 h-5 text-stone-600" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        {sidebar && (
          <aside className="w-64 bg-white border-r border-stone-200 p-4">{sidebar}</aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

interface DashboardSidebarProps {
  activeView?: string
  onViewChange?: (view: string) => void
}

export function DashboardSidebar({
  activeView = 'metrics',
  onViewChange,
}: DashboardSidebarProps = {}) {
  const menuItems = [
    { icon: Activity, label: 'Activity Monitor', id: 'metrics' },
    { icon: Terminal, label: 'Agent Console', id: 'agents' },
    { icon: GitBranch, label: 'Git Operations', id: 'git' },
    { icon: BarChart3, label: 'Analytics', id: 'analytics' },
  ]

  return (
    <nav className="space-y-1">
      {menuItems.map((item) => (
        <button
          type="button"
          key={item.id}
          onClick={() => onViewChange?.(item.id)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === item.id
              ? 'bg-stone-100 text-stone-900'
              : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
          }`}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </button>
      ))}
    </nav>
  )
}
