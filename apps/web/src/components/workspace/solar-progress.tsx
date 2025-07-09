'use client'

import { useEffect, useState } from 'react'

interface SolarProgressIndicatorProps {
  mode?: 'observe' | 'guide' | 'collaborate' | 'autonomous'
  progress?: number
}

export function SolarProgressIndicator({
  mode = 'observe',
  progress,
}: SolarProgressIndicatorProps) {
  const [animationProgress, setAnimationProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationProgress((prev) => (prev + 1) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const getModeGradient = () => {
    switch (mode) {
      case 'observe':
        return 'from-dawn-400 via-dawn-500 to-dawn-600'
      case 'guide':
        return 'from-morning-400 via-morning-500 to-morning-600'
      case 'collaborate':
        return 'from-noon-400 via-noon-500 to-noon-600'
      case 'autonomous':
        return 'from-twilight-400 via-twilight-500 to-twilight-600'
    }
  }

  const getAutonomyLevel = () => {
    switch (mode) {
      case 'observe':
        return 25
      case 'guide':
        return 50
      case 'collaborate':
        return 75
      case 'autonomous':
        return 100
    }
  }

  const autonomyLevel = progress ?? getAutonomyLevel()

  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Outer Ring - Solar Orbit */}
      <div
        className="absolute inset-0 rounded-full border-4 border-stone-200"
        style={{
          background: `conic-gradient(from ${animationProgress}deg, transparent 0deg, rgba(251, 191, 36, 0.2) 90deg, transparent 180deg)`,
        }}
      />

      {/* Inner Circle - Sun Core */}
      <div
        className={`
        absolute inset-4 rounded-full bg-gradient-to-br ${getModeGradient()}
        animate-pulse shadow-lg
      `}
      >
        <div className="absolute inset-0 rounded-full animate-spin-slow">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full opacity-80" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full opacity-60" />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-70" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-50" />
        </div>
      </div>

      {/* Autonomy Level Display */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-white drop-shadow-lg">{autonomyLevel}%</div>
          <div className="text-xs text-white/80 font-medium uppercase tracking-wider mt-1">
            Autonomy
          </div>
        </div>
      </div>

      {/* Solar Flares */}
      {mode === 'autonomous' && (
        <>
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-8 bg-gradient-to-t from-yellow-400 to-transparent animate-pulse" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-8 bg-gradient-to-b from-yellow-400 to-transparent animate-pulse" />
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-8 h-1 bg-gradient-to-l from-yellow-400 to-transparent animate-pulse" />
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-1 bg-gradient-to-r from-yellow-400 to-transparent animate-pulse" />
        </>
      )}
    </div>
  )
}

// Mini version for header/status displays
export function SolarProgressMini({
  mode = 'observe',
}: { mode?: SolarProgressIndicatorProps['mode'] }) {
  const getModeColor = () => {
    switch (mode) {
      case 'observe':
        return 'bg-dawn-500'
      case 'guide':
        return 'bg-morning-500'
      case 'collaborate':
        return 'bg-noon-500'
      case 'autonomous':
        return 'bg-twilight-500'
    }
  }

  return (
    <div className="relative w-6 h-6">
      <div className={`absolute inset-0 rounded-full ${getModeColor()} animate-pulse`} />
      <div className="absolute inset-0 rounded-full animate-spin-slow">
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
      </div>
    </div>
  )
}
