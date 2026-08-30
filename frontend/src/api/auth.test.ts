import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/api/client'
import { login, logout, me, register } from '@/api/auth'

describe('auth api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('register posts to /auth/register and returns the created user', async () => {
    const user = { id: 1, name: 'Pierre', email: 'p@example.com', created_at: '', updated_at: '' }
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { data: user, message: 'ok' } })

    const result = await register({
      name: 'Pierre',
      email: 'p@example.com',
      password: 'password123',
      password_confirmation: 'password123',
    })

    expect(post).toHaveBeenCalledWith('/auth/register', {
      name: 'Pierre',
      email: 'p@example.com',
      password: 'password123',
      password_confirmation: 'password123',
    })
    expect(result).toEqual(user)
  })

  it('login posts credentials and returns the token payload', async () => {
    const tokenPayload = { access_token: 'abc', token_type: 'Bearer', expires_in: 3600 }
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { data: tokenPayload } })

    const result = await login({ email: 'p@example.com', password: 'password123' })

    expect(post).toHaveBeenCalledWith('/auth/login', {
      email: 'p@example.com',
      password: 'password123',
    })
    expect(result).toEqual(tokenPayload)
  })

  it('logout posts to /auth/logout', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} })

    await logout()

    expect(post).toHaveBeenCalledWith('/auth/logout')
  })

  it('me unwraps the data envelope', async () => {
    const user = { id: 1, name: 'Pierre', email: 'p@example.com', created_at: '', updated_at: '' }
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: user } })

    const result = await me()

    expect(result).toEqual(user)
  })
})
