'use client'

import config from '@/config-adapter'
import { useProjectStore } from '@/store/project-store'
import { useEffect } from 'react'

/**
 * Component that ensures default projects exist with correct IDs
 * This is necessary because the backend expects specific project IDs
 */
export function ProjectInitializer() {
  const { projects, addProject, selectProject, selectedProjectId } = useProjectStore()

  useEffect(() => {
    // Check if devkit project exists
    const devkitProject = projects.find((p) => p.id === 'devkit')

    if (!devkitProject) {
      // Add the devkit project with the correct ID
      addProject({
        name: 'Happy DevKit',
        path: '~/Development/happy-devkit',
        description: 'Core development toolkit',
        icon: '🛠️',
        color: '#3B82F6',
        hasSubmoduleMCP: true,
        mcpServerUrl: config.mcpServerUrl,
      })
    }

    // If no project is selected and devkit exists, select it
    if (!selectedProjectId && projects.length > 0) {
      const devkit = projects.find((p) => p.id === 'devkit')
      if (devkit) {
        selectProject('devkit')
      } else if (projects.length > 0) {
        // Select the first available project
        selectProject(projects[0]?.id ?? '')
      }
    }
  }, [projects, addProject, selectProject, selectedProjectId])

  return null
}
