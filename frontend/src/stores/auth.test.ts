import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as authApi from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/api/auth')

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('stores the token and loads the current user on login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'token-123',
      token_type: 'Bearer',
      expires_in: 3600,
    })
    vi.mocked(authApi.me).mockResolvedValue({
      id: 1,
      name: 'Pierre',
      email: 'pierre@example.com',
      created_at: '',
      updated_at: '',
    })

    const store = useAuthStore()
    await store.login('pierre@example.com', 'password')

    expect(localStorage.getItem('recipbot.token')).toBe('token-123')
    expect(store.user?.name).toBe('Pierre')
    expect(store.isAuthenticated).toBe(true)
  })

  it('surfaces an error message and does not store a token on failed login', async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      response: { status: 401, data: { message: 'Invalid credentials' } },
    })

    const store = useAuthStore()
    await expect(store.login('pierre@example.com', 'wrong')).rejects.toBeDefined()

    expect(store.error).toBe('Invalid credentials')
    expect(localStorage.getItem('recipbot.token')).toBeNull()
  })

  it('clears the token and user on logout', async () => {
    localStorage.setItem('recipbot.token', 'token-123')
    vi.mocked(authApi.logout).mockResolvedValue(undefined)

    const store = useAuthStore()
    await store.logout()

    expect(localStorage.getItem('recipbot.token')).toBeNull()
    expect(store.user).toBeNull()
  })
})
