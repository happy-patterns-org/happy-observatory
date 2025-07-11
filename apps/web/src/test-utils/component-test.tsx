import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { vi } from 'vitest'

// Custom providers that wrap components during testing
interface AllTheProvidersProps {
  children: React.ReactNode
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 0,
        fetcher: () => Promise.resolve({}),
        provider: () => new Map(),
      }}
    >
      {children}
    </SWRConfig>
  )
}

// Custom render function that includes all providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything from RTL
export * from '@testing-library/react'
export { customRender as render }

// Common test utilities
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}

// Mock Next.js router
export const setupRouterMock = () => {
  vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    usePathname: () => '/test-path',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
  }))
}

// Mock window.matchMedia for responsive components
export const setupMatchMediaMock = (matches = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// Mock IntersectionObserver for lazy-loaded components
export const setupIntersectionObserverMock = () => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: () => [],
  })) as any
}

// Mock ResizeObserver for responsive components
export const setupResizeObserverMock = () => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as any
}

// Common setup for all component tests
export const setupComponentTest = () => {
  setupRouterMock()
  setupMatchMediaMock()
  setupIntersectionObserverMock()
  setupResizeObserverMock()
}