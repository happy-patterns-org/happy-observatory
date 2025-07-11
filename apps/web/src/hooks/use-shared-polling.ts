'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface PollingOptions {
  key: string
  fetcher: () => Promise<any>
  interval?: number
  onError?: (error: Error) => void
  onSuccess?: (data: any) => void
}

// Global cache for polling data
const pollingCache = new Map<
  string,
  {
    data: any
    error: Error | null
    lastFetch: number
    subscribers: Set<() => void>
    fetching: boolean
  }
>()

/**
 * Shared polling hook that prevents duplicate API calls
 * Multiple components using the same key will share the same data
 */
export function useSharedPolling<T = any>({
  key,
  fetcher,
  interval = 30000,
  onError,
  onSuccess,
}: PollingOptions) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isMounted = useRef(true)

  // Get or create cache entry
  const getCacheEntry = useCallback(() => {
    if (!pollingCache.has(key)) {
      pollingCache.set(key, {
        data: null,
        error: null,
        lastFetch: 0,
        subscribers: new Set(),
        fetching: false,
      })
    }
    return pollingCache.get(key)!
  }, [key])

  // Fetch data with rate limit handling
  const fetchData = useCallback(async () => {
    const entry = getCacheEntry()

    // Prevent concurrent fetches
    if (entry.fetching) return

    // Check if data is still fresh
    const now = Date.now()
    if (now - entry.lastFetch < interval / 2) {
      // Data is fresh, use cached version
      if (isMounted.current) {
        setData(entry.data)
        setError(entry.error)
        setIsLoading(false)
      }
      return
    }

    entry.fetching = true

    try {
      const result = await fetcher()

      entry.data = result
      entry.error = null
      entry.lastFetch = now

      // Notify all subscribers
      entry.subscribers.forEach((callback) => callback())

      if (isMounted.current) {
        setData(result)
        setError(null)
        setIsLoading(false)
        onSuccess?.(result)
      }
    } catch (err) {
      const error = err as Error

      // Check if it's a rate limit error
      if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        console.warn(`Rate limited for ${key}. Backing off...`)

        // Exponential backoff: double the interval
        const backoffDelay = interval * 2
        setTimeout(() => {
          if (isMounted.current) {
            fetchData()
          }
        }, backoffDelay)
      }

      entry.error = error
      entry.lastFetch = now

      // Notify all subscribers
      entry.subscribers.forEach((callback) => callback())

      if (isMounted.current) {
        setError(error)
        setIsLoading(false)
        onError?.(error)
      }
    } finally {
      entry.fetching = false
    }
  }, [key, fetcher, interval, onError, onSuccess, getCacheEntry])

  // Subscribe to updates
  useEffect(() => {
    const entry = getCacheEntry()

    // Use cached data if available
    if (entry.data !== null || entry.error !== null) {
      setData(entry.data)
      setError(entry.error)
      setIsLoading(false)
    }

    // Subscribe to updates
    const updateCallback = () => {
      if (isMounted.current) {
        setData(entry.data)
        setError(entry.error)
        setIsLoading(false)
      }
    }

    entry.subscribers.add(updateCallback)

    // Initial fetch
    fetchData()

    // Set up polling interval
    const intervalId = setInterval(fetchData, interval)

    // Cleanup
    return () => {
      isMounted.current = false
      entry.subscribers.delete(updateCallback)
      clearInterval(intervalId)

      // Clean up cache if no more subscribers
      if (entry.subscribers.size === 0) {
        pollingCache.delete(key)
      }
    }
  }, [key, fetchData, interval, getCacheEntry])

  return {
    data,
    error,
    isLoading,
    refetch: fetchData,
  }
}

/**
 * Clear all cached polling data
 */
export function clearPollingCache() {
  pollingCache.clear()
}

/**
 * Clear specific cached polling data
 */
export function clearPollingCacheKey(key: string) {
  pollingCache.delete(key)
}
