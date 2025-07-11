'use client'

import { API_PATHS } from '@/config-adapter'
import { logger } from '@/lib/logger-client'
import { useProjectStore } from '@/store/project-store'
import type { Project } from '@/store/project-store'
import { useEffect } from 'react'
import useSWR from 'swr'

type UseProjectsOptions = {}

interface UseProjectsResult {
  projects: Project[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// Define a fetcher function that includes credentials
const fetcher = async (url: string) => {
  const response = await fetch(url, {
    credentials: 'include',
  })

  if (!response.ok) {
    // Handle rate limiting specifically
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const error = new Error(`Rate limited. Retry after ${retryAfter || '60'} seconds`)
      ;(error as any).status = 429
      ;(error as any).retryAfter = retryAfter
      throw error
    }

    throw new Error(`Failed to fetch projects: ${response.statusText}`)
  }

  const data = await response.json()
  return data.projects || []
}

/**
 * Hook to fetch and merge projects from the server with local store
 * Now uses SWR to prevent request loops and handle caching properly
 */
export function useProjects(_options: UseProjectsOptions = {}): UseProjectsResult {
  const { projects: storeProjects, updateProject } = useProjectStore()

  // Use SWR for data fetching with proper caching and deduplication
  const {
    data: serverProjects,
    error,
    isLoading,
    mutate,
  } = useSWR<Project[]>(API_PATHS.projects, fetcher, {
    // Revalidate every 30 seconds (instead of constantly)
    refreshInterval: 30000,
    // Don't revalidate on window focus to prevent storms
    revalidateOnFocus: false,
    // Keep previous data while revalidating
    keepPreviousData: true,
    // Retry with exponential backoff on errors
    onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
      // Don't retry on 404s
      if (error.status === 404) return

      // For rate limiting, wait for the specified time
      if (error.status === 429) {
        const retryAfter = Number.parseInt(error.retryAfter || '60', 10)
        setTimeout(() => revalidate({ retryCount }), retryAfter * 1000)
        return
      }

      // For other errors, use exponential backoff
      if (retryCount >= 3) return
      setTimeout(() => revalidate({ retryCount }), 5000 * Math.pow(2, retryCount))
    },
  })

  // Merge server projects with store projects when data changes
  useEffect(() => {
    if (!serverProjects || isLoading) return

    // Create a map for efficient merging
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
          ...(existing.lastAccessed && { lastAccessed: existing.lastAccessed }),
          ...(existing.agentActivity && { agentActivity: existing.agentActivity }),
          ...(existing.connectionStatus && { connectionStatus: existing.connectionStatus }),
        }
        updateProject(serverProject.id, updated)
      } else {
        // Add new project from server
        // Directly update the store to preserve the server-provided ID
        useProjectStore.setState((state) => ({
          projects: [
            ...state.projects,
            {
              ...serverProject,
              lastAccessed: new Date(),
            },
          ],
        }))
      }
    })

    logger.info('Projects synced', {
      serverCount: serverProjects.length,
      storeCount: storeProjects.length,
    })
  }, [serverProjects, isLoading])

  // Combine server and store projects for the result
  const mergedProjects = storeProjects

  return {
    projects: mergedProjects,
    isLoading,
    error,
    refetch: () => mutate(),
  }
}
