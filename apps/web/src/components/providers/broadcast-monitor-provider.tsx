'use client'

import { getBroadcastMonitor } from '@/lib/broadcast-monitor'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function BroadcastMonitorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const monitor = getBroadcastMonitor()

    // Custom handler for breaking changes
    const handleBreakingChange = (broadcast: any) => {
      switch (broadcast.type) {
        case 'BREAKING_CHANGE_DETECTED':
          toast.error('🚨 Breaking Change Detected', {
            description: 'Shared configuration has breaking changes. Check console for details.',
            duration: Infinity, // Keep showing until dismissed
            action: {
              label: 'View Details',
              onClick: () => {
                console.error('Breaking change details:', broadcast)
              },
            },
          })
          break
        
        case 'MIGRATION_REQUIRED':
          toast.warning('📦 Migration Required', {
            description: broadcast.message || 'A migration is required for shared configuration.',
            duration: 30000, // Show for 30 seconds
          })
          break
        
        case 'UPDATE_AVAILABLE':
          toast.info(`🔄 Update Available${broadcast.version ? ` (v${broadcast.version})` : ''}`, {
            description: broadcast.message || 'A new version of shared configuration is available.',
            duration: 10000, // Show for 10 seconds
          })
          break
        
        case 'SHARED_CONFIG_UPDATED':
          toast.success('✅ Configuration Updated', {
            description: broadcast.message || 'Shared configuration has been updated successfully.',
            duration: 5000, // Show for 5 seconds
          })
          break
      }
    }

    // Create a new monitor instance with custom handler
    const customMonitor = new (monitor.constructor as any)({
      onBreakingChange: handleBreakingChange,
    })

    customMonitor.start()

    // Cleanup on unmount
    return () => {
      customMonitor.stop()
    }
  }, [])

  return <>{children}</>
}