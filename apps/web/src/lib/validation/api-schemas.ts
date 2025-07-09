import { z } from 'zod'

/**
 * Authentication schemas
 */
export const loginRequestSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
})

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1),
})

/**
 * Agent command schemas
 */
export const agentCommandRequestSchema = z.object({
  agentId: z.string().min(1).max(100),
  command: z.string().min(1).max(100),
  parameters: z.record(z.unknown()).optional().default({}),
  source: z.enum(['cli', 'dashboard', 'api']).optional().default('api'),
})

export const agentStatusRequestSchema = z.object({
  status: z.enum(['online', 'offline', 'busy', 'error']),
  message: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

/**
 * Project schemas
 */
export const createProjectRequestSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1).max(500),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
})

export const updateProjectRequestSchema = createProjectRequestSchema.partial()

/**
 * Telemetry schemas
 */
export const telemetryEventSchema = z.object({
  projectId: z.string(),
  agentId: z.string(),
  eventType: z.string().max(100),
  timestamp: z.string().datetime(),
  data: z.record(z.unknown()),
})

export const telemetryQuerySchema = z.object({
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  eventType: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
})

/**
 * Console/Terminal schemas
 */
export const consoleExecuteRequestSchema = z.object({
  command: z.string().min(1).max(1000),
  workingDirectory: z.string().optional(),
  env: z.record(z.string()).optional(),
  timeout: z.number().int().min(0).max(300000).optional().default(30000), // Max 5 minutes
})

/**
 * WebSocket message schemas
 */
export const wsMessageSchema = z.object({
  type: z.enum(['subscribe', 'unsubscribe', 'ping', 'command', 'event']),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  data: z.unknown().optional(),
})

/**
 * Common response schemas
 */
export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
  code: z.string().optional(),
  timestamp: z.string().datetime().optional(),
})

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown().optional(),
  message: z.string().optional(),
})

/**
 * Type exports
 */
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type AgentCommandRequest = z.infer<typeof agentCommandRequestSchema>
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>
export type ConsoleExecuteRequest = z.infer<typeof consoleExecuteRequestSchema>
export type WSMessage = z.infer<typeof wsMessageSchema>
