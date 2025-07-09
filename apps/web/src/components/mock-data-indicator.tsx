'use client'

import { AlertCircle } from 'lucide-react'

interface MockDataIndicatorProps {
  feature: string
  className?: string
}

export function MockDataIndicator({ feature, className = '' }: MockDataIndicatorProps) {
  return (
    <div
      className={`flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded ${className}`}
    >
      <AlertCircle className="w-3 h-3" />
      <span>{feature} (simulated data)</span>
    </div>
  )
}
