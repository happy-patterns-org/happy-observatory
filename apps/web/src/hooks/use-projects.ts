'use client'

import { useEffect, useState } from 'react'
import { useProjectStore } from '@/store/project-store'
import { logger } from '@/lib/logger-client'
import type { Project } from '@/store/project-store'

interface UseProjectsOptions {
  autoFetch?: boolean
  refreshInterval?: number
}

interface UseProjectsResult {
  projects: Project[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch and merge projects from the server with local store
 * Server projects are considered the source of truth for metadata
 */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsResult {
  const { autoFetch = true, refreshInterval = 0 } = options
  const { projects: storeProjects, updateProject, addProject } = useProjectStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mergedProjects, setMergedProjects] = useState<Project[]>(storeProjects)

  const fetchProjects = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/projects')

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`)
      }

      const data = await response.json()
      const serverProjects: Project[] = data.projects || []

      // Merge server projects with store projects
      const merged = new Map<string, Project>()

      // Start with store projects (preserves local-only projects)
      storeProjects.forEach((project) => {
        merged.set(project.id, project)
      })

      // Merge in server projects (server metadata takes precedence)
      serverProjects.forEach((serverProject) => {
        const existing = merged.get(serverProject.id)

        if (existing) {
          // Update existing project with server metadata
          const updated: Project = {
            ...existing,
            ...serverProject,
            // Preserve local runtime state
            lastAccessed: existing.lastAccessed,
            agentActivity: existing.agentActivity,
            connectionStatus: existing.connectionStatus,
          }
          merged.set(serverProject.id, updated)
          updateProject(serverProject.id, updated)
        } else {
          // Add new project from server
          merged.set(serverProject.id, serverProject)
          addProject(serverProject)
        }
      })

      const mergedArray = Array.from(merged.values())
      setMergedProjects(mergedArray)

      logger.info('Projects synced', {
        serverCount: serverProjects.length,
        storeCount: storeProjects.length,
        mergedCount: mergedArray.length,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      logger.error('Failed to fetch projects', err as Error)
      // Fall back to store projects on error
      setMergedProjects(storeProjects)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchProjects()
    }
  }, [autoFetch])

  // Refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchProjects, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval])

  // Update merged projects when store changes
  useEffect(() => {
    if (!isLoading) {
      setMergedProjects(storeProjects)
    }
  }, [storeProjects, isLoading])

  return {
    projects: mergedProjects,
    isLoading,
    error,
    refetch: fetchProjects,
  }
}
