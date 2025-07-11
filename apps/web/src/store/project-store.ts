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
const generateId = (projectName?: string) => {
  // For known backend projects, use their expected IDs
  if (projectName) {
    const normalizedName = projectName.toLowerCase()
    if (normalizedName.includes('devkit') || normalizedName === 'happy devkit') {
      return 'devkit'
    }
    if (normalizedName.includes('scopecam')) {
      return 'scopecam'
    }
  }

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
          id: generateId(projectData.name),
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

        if (project && id) {
          get().updateProject(id, { lastAccessed: new Date() })
        }
      },

      updateProject: (id, updates) => {
        // Ensure mcpServerUrl is always a string if provided
        const sanitizedUpdates = { ...updates }
        if (sanitizedUpdates.mcpServerUrl && typeof sanitizedUpdates.mcpServerUrl !== 'string') {
          console.error(
            'Attempted to set mcpServerUrl to non-string value:',
            sanitizedUpdates.mcpServerUrl
          )
          delete sanitizedUpdates.mcpServerUrl
        }

        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...sanitizedUpdates } : p)),
          selectedProject:
            state.selectedProjectId === id
              ? { ...state.selectedProject!, ...sanitizedUpdates }
              : state.selectedProject,
        }))
      },

      updateAgentActivity: (projectId, activity) => {
        get().updateProject(projectId, activity ? { agentActivity: activity } : {})
      },

      updateConnectionStatus: (projectId, status) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (project) {
          const currentStatus = project.connectionStatus || {
            bridge: 'disconnected' as const,
            mcp: 'disconnected' as const
          }
          get().updateProject(projectId, {
            connectionStatus: {
              ...currentStatus,
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
          // Parse dates from JSON strings and clean up invalid data
          state.projects = state.projects.map((project) => ({
            ...project,
            lastAccessed: project.lastAccessed ? new Date(project.lastAccessed) : undefined,
            // Ensure mcpServerUrl is a string or undefined
            mcpServerUrl:
              typeof project.mcpServerUrl === 'string' ? project.mcpServerUrl : undefined,
          }))

          // Update selectedProject if it exists
          if (state.selectedProject) {
            if (state.selectedProject.lastAccessed) {
              state.selectedProject.lastAccessed = new Date(state.selectedProject.lastAccessed)
            }
            // Clean up mcpServerUrl if it's not a string
            if (
              state.selectedProject.mcpServerUrl &&
              typeof state.selectedProject.mcpServerUrl !== 'string'
            ) {
              delete state.selectedProject.mcpServerUrl
            }
          }
        }
      },
      // Only persist in browser
      skipHydration: typeof window === 'undefined',
    }
  )
)
