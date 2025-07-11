'use client'

import { swrConfig } from '@/lib/swr-config'
import type { ReactNode } from 'react'
import { SWRConfig } from 'swr'

interface SWRProviderProps {
  children: ReactNode
}

/**
 * Global SWR provider that applies our configuration to all SWR hooks
 * This prevents request loops and handles rate limiting gracefully
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>
}
