'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login
    router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-dawn-500 to-morning-500 rounded-lg animate-pulse" />
        <h1 className="text-2xl font-semibold text-stone-900 mb-2">Happy Observatory</h1>
        <p className="text-stone-600">Redirecting to login...</p>
      </div>
    </div>
  )
}
