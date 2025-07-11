import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// This configures a request mocking server with the given request handlers.
export const server = setupServer(...handlers)

// Enable request interception on test start
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers())

// Clean up after the tests are finished.
afterAll(() => server.close())