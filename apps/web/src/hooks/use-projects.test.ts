import { renderHook, waitFor } from '@testing-library/react'
import { useProjects } from './use-projects'
import { SWRConfig } from 'swr'
import React from 'react'
import { vi } from 'vitest'
import { useProjectStore } from '@/store/project-store'

// Mock the project store
vi.mock('@/store/project-store')

// Mock the project API
const mockFetch = vi.fn()
global.fetch = mockFetch

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(SWRConfig, { 
    value: { 
      dedupingInterval: 0,
      provider: () => new Map(),
      isVisible: () => true,
      initFocus: () => false,
      initReconnect: () => false,
    } 
  }, children)
}

describe('useProjects', () => {
  const mockServerProjects = [
    {
      id: 'proj-1',
      name: 'Project 1',
      path: '/home/user/project1',
      type: 'git',
      status: 'active',
    },
    {
      id: 'proj-2',
      name: 'Project 2',
      path: '/home/user/project2',
      type: 'npm',
      status: 'active',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
    
    // Setup store mock
    const mockStore = {
      projects: [],
      updateProject: vi.fn(),
    }
    
    vi.mocked(useProjectStore).mockReturnValue(mockStore)
    vi.mocked(useProjectStore).setState = vi.fn((updater: any) => {
      if (typeof updater === 'function') {
        const newState = updater(mockStore)
        mockStore.projects = newState.projects
      }
    })
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ projects: mockServerProjects }),
    })
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and returns projects', async () => {
    const { result, rerender } = renderHook(() => useProjects(), { wrapper })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    // Wait for data to load and store to update
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    // Force a rerender to pick up store changes
    rerender()
    
    // Wait for the projects to be updated in the store
    await waitFor(() => {
      expect(vi.mocked(useProjectStore).setState).toHaveBeenCalled()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
      credentials: 'include',
    })
  })

  it('handles empty project list', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ projects: [] }),
    })

    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
      credentials: 'include',
    })
  })

  it('handles fetch errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toBe('Network error')
  })

  it('handles API errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toContain('Failed to fetch projects')
  })

  it('revalidates data when mutate is called', async () => {
    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Trigger revalidation
    result.current.refetch()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  it('deduplicates requests', async () => {
    // Create a shared wrapper for both hooks
    const SharedWrapper = ({ children }: { children: React.ReactNode }) => (
      <SWRConfig value={{ dedupingInterval: 2000 }}>
        {children}
      </SWRConfig>
    )
    
    // Render two hooks with the same wrapper instance
    const { result: result1 } = renderHook(() => useProjects(), { wrapper: SharedWrapper })
    const { result: result2 } = renderHook(() => useProjects(), { wrapper: SharedWrapper })

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false)
      expect(result2.current.isLoading).toBe(false)
    })

    // With deduplication, both hooks should share the same request
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

})