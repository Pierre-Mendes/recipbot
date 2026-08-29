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
    // Read before login too: isAuthenticated must update reactively when the
    // token changes, not just return the right value on its first access.
    expect(store.isAuthenticated).toBe(false)

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
    expect(store.isAuthenticated).toBe(false)
  })

  it('clearSession drops the token and flips isAuthenticated without calling the API', () => {
    localStorage.setItem('recipbot.token', 'token-123')

    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(true)

    store.clearSession()

    expect(localStorage.getItem('recipbot.token')).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(authApi.logout).not.toHaveBeenCalled()
  })

  it('registers without logging the user in or storing a token', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      id: 1,
      name: 'Pierre',
      email: 'pierre@example.com',
      created_at: '',
      updated_at: '',
    })

    const store = useAuthStore()
    await store.register('Pierre', 'pierre@example.com', 'password', 'password')

    expect(authApi.register).toHaveBeenCalledWith({
      name: 'Pierre',
      email: 'pierre@example.com',
      password: 'password',
      password_confirmation: 'password',
    })
    // Registration does not authenticate - the user still has to log in.
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem('recipbot.token')).toBeNull()
  })

  it('falls back to a generic message when a failed register carries no server message', async () => {
    vi.mocked(authApi.register).mockRejectedValue(new Error('network error'))

    const store = useAuthStore()
    await expect(
      store.register('Pierre', 'pierre@example.com', 'password', 'password'),
    ).rejects.toBeDefined()

    expect(store.error).toBe('Registration failed')
    expect(store.loading).toBe(false)
  })
})
