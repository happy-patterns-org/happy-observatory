'use client'

import { ProjectInitializer } from '@/components/project-initializer'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
        })

        if (!response.ok) {
          router.push('/login')
        } else {
          setIsChecking(false)
        }
      } catch (error) {
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-dawn-500 to-morning-500 rounded-lg animate-pulse" />
          <p className="text-stone-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ProjectInitializer />
      {children}
    </>
  )
}
