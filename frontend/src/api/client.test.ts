import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { apiClient } from '@/api/client'
import { getToken, setToken } from '@/utils/auth'

// axios does not expose interceptor handlers in its public types, so the
// internal array is reached through a loosely-typed alias for testing.
const interceptors = apiClient.interceptors as unknown as {
  request: { handlers: [{ fulfilled: (config: { headers: Record<string, string> }) => Promise<{ headers: Record<string, string> }> }] }
  response: { handlers: [{ rejected: (error: { response: { status: number } }) => Promise<never> }] }
}

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('attaches the stored bearer token to outgoing requests', async () => {
    setToken('abc-123')

    const config = await interceptors.request.handlers[0].fulfilled({
      headers: {},
    })

    expect(config.headers.Authorization).toBe('Bearer abc-123')
  })

  it('does not set an Authorization header when there is no token', async () => {
    const config = await interceptors.request.handlers[0].fulfilled({
      headers: {},
    })

    expect(config.headers.Authorization).toBeUndefined()
  })

  it('clears the token when a response fails with 401', async () => {
    setToken('abc-123')

    await expect(
      interceptors.response.handlers[0].rejected({
        response: { status: 401 },
      }),
    ).rejects.toBeDefined()

    expect(getToken()).toBeNull()
  })

  it('leaves the token alone for non-401 errors', async () => {
    setToken('abc-123')

    await expect(
      interceptors.response.handlers[0].rejected({
        response: { status: 422 },
      }),
    ).rejects.toBeDefined()

    expect(getToken()).toBe('abc-123')
  })
})
