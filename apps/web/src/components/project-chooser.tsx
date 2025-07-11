'use client'

import { ProjectIcon } from '@/components/project-icon'
import { useProjects } from '@/hooks/use-projects'
import { detectMCPServer } from '@/lib/mcp-detector-enhanced'
import { type DetectedProject, ProjectDetector } from '@/lib/project-detector'
import { sanitizePath, sanitizeProjectName, validateProject } from '@/lib/validation'
import { useProjectStore } from '@/store/project-store'
import { Activity, ChevronDown, Loader2, Plus, Search, Server, X } from 'lucide-react'
import { useState } from 'react'

export function ProjectChooser() {
  const { selectedProject, selectProject, addProject, removeProject } = useProjectStore()
  const { projects } = useProjects({
    autoFetch: true,
    refreshInterval: 30000, // Refresh every 30 seconds
  })
  const [isOpen, setIsOpen] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAutoDetect, setShowAutoDetect] = useState(false)
  const [detectedProjects, setDetectedProjects] = useState<DetectedProject[]>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    path: '',
    description: '',
  })
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleAddProject = () => {
    setValidationError(null)

    const validation = validateProject(newProject)
    if (!validation.success) {
      setValidationError(validation.error || 'Invalid project data')
      return
    }

    const sanitizedProject = {
      name: sanitizeProjectName(validation.data?.name || ''),
      path: sanitizePath(validation.data?.path || ''),
      ...(validation.data?.description && { description: validation.data.description }),
    }

    addProject(sanitizedProject)
    setNewProject({ name: '', path: '', description: '' })
    setShowAddDialog(false)
  }

  const handleSelectProject = (projectId: string) => {
    selectProject(projectId)
    setIsOpen(false)
  }

  const handleAutoDetect = async () => {
    setIsDetecting(true)
    setShowAutoDetect(true)
    try {
      const detected = await ProjectDetector.detectLocalProjects()
      // Filter out already added projects
      const existingPaths = projects.map((p) => p.path)
      const newDetected = detected.filter((d) => !existingPaths.includes(d.path))
      setDetectedProjects(newDetected)
    } catch (error) {
      console.error('Failed to detect projects:', error)
      setDetectedProjects([])
    } finally {
      setIsDetecting(false)
    }
  }

  const handleAddDetectedProject = async (detected: DetectedProject) => {
    // Check if this is a known project that needs a specific ID
    const isDevKitProject =
      detected.name.toLowerCase().includes('devkit') ||
      detected.path.toLowerCase().includes('happy-devkit')

    // Don't add if it's devkit and already exists
    if (isDevKitProject && projects.some((p) => p.id === 'devkit')) {
      setDetectedProjects((prev) => prev.filter((p) => p.path !== detected.path))
      return
    }

    const projectData = {
      name: detected.name,
      path: detected.path,
      description: detected.description || `${detected.type} project`,
    }

    // Check for MCP server
    if (detected.hasMCP) {
      const mcpInfo = await detectMCPServer(detected.path)
      if (mcpInfo.isAvailable && mcpInfo.serverUrl) {
        addProject({
          ...projectData,
          hasSubmoduleMCP: true,
          mcpServerUrl: mcpInfo.serverUrl,
        })
      } else {
        addProject(projectData)
      }
    } else {
      addProject(projectData)
    }

    // Remove from detected list
    setDetectedProjects((prev) => prev.filter((p) => p.path !== detected.path))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
        style={{
          borderColor: selectedProject?.color ? `${selectedProject.color}40` : undefined,
          backgroundColor: selectedProject?.color ? `${selectedProject.color}08` : undefined,
        }}
      >
        <ProjectIcon
          {...(selectedProject?.icon && { icon: selectedProject.icon })}
          name={selectedProject?.name || 'Project'}
          size="md"
        />
        <span className="text-sm font-medium text-stone-900">
          {selectedProject ? selectedProject.name : 'Select Project'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-stone-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-80 bg-white border border-stone-300 rounded-lg shadow-lg z-50">
          <div className="p-2 space-y-1">
            <button
              onClick={() => setShowAddDialog(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Project
            </button>
            <button
              onClick={handleAutoDetect}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
            >
              <Search className="w-4 h-4" />
              Auto-detect Projects
            </button>
          </div>

          <div className="border-t border-stone-200">
            {projects.length === 0 ? (
              <div className="p-4 text-sm text-stone-500 text-center">No projects added yet</div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`relative group ${
                      selectedProject?.id === project.id ? 'bg-stone-100' : ''
                    }`}
                  >
                    <button
                      onClick={() => handleSelectProject(project.id)}
                      className="w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <ProjectIcon
                              {...(project.icon && { icon: project.icon })}
                              name={project.name}
                              size="md"
                              className={project.color ? '' : ''}
                            />
                            <div className="font-medium text-sm text-stone-900">{project.name}</div>
                            {project.color && (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: project.color }}
                              />
                            )}
                          </div>
                          <div className="text-xs text-stone-500 mt-1 ml-7">{project.path}</div>
                          {project.description && (
                            <div className="text-xs text-stone-600 mt-1 ml-7">
                              {project.description}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {project.hasSubmoduleMCP && (
                              <div className="flex items-center gap-1 text-xs text-green-600">
                                <Server className="w-3 h-3" />
                                MCP Server
                              </div>
                            )}
                            {project.agentActivity && (
                              <div className="flex items-center gap-1 text-xs text-blue-600">
                                <Activity className="w-3 h-3" />
                                {project.agentActivity.activeAgents} active
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeProject(project.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-200 rounded transition-all"
                        >
                          <X className="w-4 h-4 text-stone-600" />
                        </button>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAutoDetect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-h-[600px] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Detected Projects</h3>

            {isDetecting ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-stone-600" />
                <span className="ml-2 text-sm text-stone-600">Scanning for projects...</span>
              </div>
            ) : detectedProjects.length === 0 ? (
              <div className="py-12 text-center text-stone-500">
                <p>No new projects found.</p>
                <p className="text-sm mt-2">All detected projects are already added.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {detectedProjects.map((project) => (
                  <div
                    key={project.path}
                    className="border border-stone-200 rounded-lg p-4 hover:bg-stone-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-stone-900">{project.name}</div>
                        <div className="text-xs text-stone-500 mt-1">{project.path}</div>
                        <div className="text-xs text-stone-600 mt-1">{project.description}</div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs px-2 py-1 bg-stone-100 rounded-full">
                            {project.type}
                          </span>
                          {project.hasGit && <span className="text-xs text-stone-600">Git</span>}
                          {project.hasMCP && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Server className="w-3 h-3" />
                              MCP
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddDetectedProject(project)}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowAutoDetect(false)
                  setDetectedProjects([])
                }}
                className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Project</h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="project-name"
                  className="block text-sm font-medium text-stone-700 mb-1"
                >
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., ScopeCam"
                />
              </div>
              <div>
                <label
                  htmlFor="project-path"
                  className="block text-sm font-medium text-stone-700 mb-1"
                >
                  Project Path
                </label>
                <input
                  id="project-path"
                  type="text"
                  value={newProject.path}
                  onChange={(e) => setNewProject({ ...newProject, path: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="~/Development/personal/scopecam"
                />
              </div>
              <div>
                <label
                  htmlFor="project-description"
                  className="block text-sm font-medium text-stone-700 mb-1"
                >
                  Description (optional)
                </label>
                <textarea
                  id="project-description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Brief project description"
                />
              </div>
            </div>
            {validationError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{validationError}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddDialog(false)
                  setNewProject({ name: '', path: '', description: '' })
                }}
                className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProject}
                disabled={!newProject.name || !newProject.path}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
