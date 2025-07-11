import { authHandlers } from './auth'
import { projectHandlers } from './projects'
import { agentHandlers } from './agents'
import { healthHandlers } from './health'

// Combine all handlers
export const handlers = [
  ...authHandlers,
  ...projectHandlers,
  ...agentHandlers,
  ...healthHandlers,
]