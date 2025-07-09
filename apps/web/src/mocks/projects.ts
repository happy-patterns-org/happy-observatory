import type { Project } from '@/store/project-store'

export const mockProjects: Project[] = [
  {
    id: 'devkit',
    name: 'Happy DevKit',
    path: '~/Development/happy-devkit',
    description: 'Core development toolkit',
    icon: '🛠️',
    color: '#3B82F6',
    dashboards: {
      main: {
        id: 'devkit-main',
        name: 'DevKit Overview',
        widgets: ['agent-status', 'build-metrics', 'test-coverage'],
      },
    },
    telemetryMap: {
      cpu: 'system.cpu.usage',
      memory: 'system.memory.usage',
      builds: 'devkit.builds.total',
      tests: 'devkit.tests.total',
    },
    hasSubmoduleMCP: true,
    mcpServerUrl: 'http://localhost:8001',
  },
  {
    id: 'scopecam',
    name: 'ScopeCam',
    path: '~/Development/personal/scopecam',
    description: 'Intelligent test orchestration platform',
    icon: '🎯',
    color: '#10B981',
    dashboards: {
      main: {
        id: 'scopecam-main',
        name: 'Test Dashboard',
        widgets: ['test-runs', 'coverage-map', 'flaky-tests'],
      },
      guardian: {
        id: 'scopecam-guardian',
        name: 'Test Guardian',
        widgets: ['guardian-status', 'auto-fixes', 'suggestions'],
      },
    },
    telemetryMap: {
      testRuns: 'scopecam.tests.runs',
      coverage: 'scopecam.coverage.percent',
      flaky: 'scopecam.tests.flaky',
      guardianActions: 'scopecam.guardian.actions',
    },
    hasSubmoduleMCP: true,
    mcpServerUrl: 'http://localhost:8002',
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Sample Project',
    path: '~/Development/sample',
    description: 'Example project without MCP',
    icon: '📦',
    color: '#8B5CF6',
    dashboards: {
      main: {
        id: 'sample-main',
        name: 'Overview',
        widgets: ['basic-metrics'],
      },
    },
    telemetryMap: {},
    hasSubmoduleMCP: false,
  },
]

export function getMockProjectsResponse() {
  return {
    projects: mockProjects,
    timestamp: new Date().toISOString(),
  }
}
