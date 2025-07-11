'use client'

import config from '@/config-adapter'
import { useProjectStore } from '@/store/project-store'
import { useEffect } from 'react'

export function ProjectInitializer() {
  const { projects, selectedProject, addProject, selectProject, updateProject } = useProjectStore()

  useEffect(() => {
    // Fix any projects with wrong MCP server URL (port 8001 -> 8080)
    projects.forEach((project) => {
      if (project.mcpServerUrl?.includes(':8001')) {
        console.log('Fixing incorrect MCP server URL for project:', project.name)
        updateProject(project.id, {
          mcpServerUrl: project.mcpServerUrl.replace(':8001', ':8080'),
        })
      }
    })
    // Check if we have a devkit project with the correct ID
    const devkitProject = projects.find((p) => p.id === 'devkit')
    const incorrectDevkit = projects.find(
      (p) =>
        p.id !== 'devkit' && (p.name.toLowerCase().includes('devkit') || p.name === 'Happy DevKit')
    )

    // If we have a devkit project with wrong ID, update it
    if (incorrectDevkit && !devkitProject) {
      updateProject(incorrectDevkit.id, { id: 'devkit' })
    }

    // Check for ScopeCam project
    const scopecamProject = projects.find((p) => p.id === 'scopecam')
    const incorrectScopecam = projects.find(
      (p) => p.id !== 'scopecam' && p.name.toLowerCase().includes('scopecam')
    )

    // If we have a scopecam project with wrong ID, just update it
    if (incorrectScopecam && !scopecamProject) {
      // For now, just ensure it exists - the ID will be generated
      // We can't control the ID through addProject
    }

    // Ensure devkit project exists
    if (!devkitProject && !incorrectDevkit) {
      addProject({
        name: 'Happy DevKit',
        path: '/Users/verlyn13/Development/business-org/happy-devkit',
        description: 'Main development environment',
        hasSubmoduleMCP: true,
        mcpServerUrl: config.mcpServerUrl,
      })
    }

    // If no project is selected, select devkit
    if (!selectedProject && projects.length > 0) {
      const devkit = projects.find((p) => p.id === 'devkit')
      if (devkit) {
        selectProject(devkit.id)
      }
    }
  }, [projects.length]) // Only re-run when number of projects changes

  return null
}
