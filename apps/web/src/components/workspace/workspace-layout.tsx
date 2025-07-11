'use client'

import type { Project } from '@/store/project-store'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  LayoutDashboard,
  Settings,
  Zap,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { ProjectChooser } from '../project-chooser'
import { ProjectInitializer } from './project-initializer'

interface WorkspaceLayoutProps {
  children: ReactNode
  sidebarCollapsed: boolean
  onSidebarToggle: () => void
  consoleCollapsed: boolean
  selectedProject?: Project | null
}

export function WorkspaceLayout({
  children,
  sidebarCollapsed,
  onSidebarToggle,
  selectedProject,
}: WorkspaceLayoutProps) {
  const sidebarItems = [
    { icon: Activity, label: 'Activity', href: '#activity' },
    { icon: LayoutDashboard, label: 'Dashboard', href: '#dashboard' },
    { icon: GitBranch, label: 'Git', href: '#git' },
    { icon: Zap, label: 'Agents', href: '#agents' },
  ]

  return (
    <>
      <ProjectInitializer />
      <div className="flex h-screen bg-stone-workspace">
        {/* Sidebar */}
        <aside
          className={`
        bg-white border-r border-stone-200 transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
      `}
        >
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="h-16 border-b border-stone-200 flex items-center justify-between px-4">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-dawn-500 to-morning-500 rounded-lg solar-glow" />
                  <span className="font-semibold text-gradient-dawn">Happy Observatory</span>
                </div>
              )}
              <button
                onClick={onSidebarToggle}
                className="p-1.5 hover:bg-stone-100 rounded-md transition-colors"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-stone-600" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-stone-600" />
                )}
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2">
              {sidebarItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                  text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </a>
              ))}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-2 border-t border-stone-200">
              <button
                className={`
                flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium w-full
                text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
                title={sidebarCollapsed ? 'Settings' : undefined}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>Settings</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              {selectedProject && (
                <div className="text-sm">
                  <span className="text-stone-500">Project:</span>
                  <span className="ml-2 font-medium text-stone-900">{selectedProject.name}</span>
                </div>
              )}
            </div>
            <ProjectChooser />
          </header>

          {/* Content */}
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </>
  )
}
