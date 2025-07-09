import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DashboardConfig {
  id: string
  name: string
  widgets: string[]
}

export interface Project {
  id: string
  name: string
  path: string
  description?: string
  icon?: string
  color?: string
  dashboards?: Record<string, DashboardConfig>
  telemetryMap?: Record<string, string>
  hasSubmoduleMCP?: boolean
  mcpServerUrl?: string
  bridgeUrl?: string
  wsUrl?: string
  lastAccessed?: Date
  agentActivity?: {
    activeAgents: number
    totalTasks: number
    completedTasks: number
  }
  connectionStatus?: {
    bridge: 'connected' | 'disconnected' | 'connecting' | 'error'
    mcp: 'connected' | 'disconnected' | 'connecting' | 'error'
    lastError?: string
  }
}

interface ProjectStore {
  projects: Project[]
  selectedProjectId: string | null
  selectedProject: Project | null
  addProject: (project: Omit<Project, 'id'>) => void
  removeProject: (id: string) => void
  selectProject: (id: string | null) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  updateAgentActivity: (projectId: string, activity: Project['agentActivity']) => void
  updateConnectionStatus: (projectId: string, status: Partial<Project['connectionStatus']>) => void
  setProjectUrls: (
    projectId: string,
    urls: { bridgeUrl?: string; wsUrl?: string; mcpServerUrl?: string }
  ) => void
}

// Helper to generate IDs safely in browser only
const generateId = () => {
  if (typeof window !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for SSR or older browsers
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      selectedProjectId: null,
      selectedProject: null,

      addProject: (projectData) => {
        const newProject: Project = {
          ...projectData,
          id: generateId(),
          lastAccessed: new Date(),
        }
        set((state) => ({
          projects: [...state.projects, newProject],
        }))
      },

      removeProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
          selectedProject: state.selectedProjectId === id ? null : state.selectedProject,
        }))
      },

      selectProject: (id) => {
        const project = id ? get().projects.find((p) => p.id === id) : null
        set({
          selectedProjectId: id,
          selectedProject: project || null,
        })

        if (project) {
          get().updateProject(id, { lastAccessed: new Date() })
        }
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          selectedProject:
            state.selectedProjectId === id
              ? { ...state.selectedProject!, ...updates }
              : state.selectedProject,
        }))
      },

      updateAgentActivity: (projectId, activity) => {
        get().updateProject(projectId, { agentActivity: activity })
      },

      updateConnectionStatus: (projectId, status) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (project) {
          get().updateProject(projectId, {
            connectionStatus: {
              ...project.connectionStatus,
              ...status,
            },
          })
        }
      },

      setProjectUrls: (projectId, urls) => {
        get().updateProject(projectId, urls)
      },
    }),
    {
      name: 'happy-observatory-projects',
      // Handle hydration of dates and clear invalid data
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to hydrate project store:', error)
          return
        }

        if (state) {
          // Parse dates from JSON strings
          state.projects = state.projects.map((project) => ({
            ...project,
            lastAccessed: project.lastAccessed ? new Date(project.lastAccessed) : undefined,
          }))

          // Update selectedProject if it exists
          if (state.selectedProject && state.selectedProject.lastAccessed) {
            state.selectedProject.lastAccessed = new Date(state.selectedProject.lastAccessed)
          }
        }
      },
      // Only persist in browser
      skipHydration: typeof window === 'undefined',
    }
  )
)
