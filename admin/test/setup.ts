import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './msw'

// jsdom ships no fetch and Node's rejects root-relative URLs; resolve them against the page origin as a browser does.
const nodeFetch = globalThis.fetch
globalThis.fetch = ((input, init) =>
  nodeFetch(typeof input === 'string' && input.startsWith('/') ? new URL(input, window.location.origin) : input, init)) as typeof fetch

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
