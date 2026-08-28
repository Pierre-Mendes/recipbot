import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import * as authApi from '@/api/auth'
import type { User } from '@/types'
import { getToken, removeToken, setToken } from '@/utils/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => Boolean(getToken()))

  async function login(email: string, password: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await authApi.login({ email, password })
      setToken(response.access_token)
      await fetchCurrentUser()
    } catch (e) {
      error.value = extractErrorMessage(e, 'Invalid credentials')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function register(
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await authApi.register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
    } catch (e) {
      error.value = extractErrorMessage(e, 'Registration failed')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } finally {
      removeToken()
      user.value = null
    }
  }

  async function fetchCurrentUser(): Promise<void> {
    if (!getToken()) return
    user.value = await authApi.me()
  }

  function extractErrorMessage(e: unknown, fallback: string): string {
    if (
      typeof e === 'object' &&
      e !== null &&
      'response' in e &&
      typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message ===
        'string'
    ) {
      return (e as { response: { data: { message: string } } }).response.data.message
    }
    return fallback
  }

  return { user, loading, error, isAuthenticated, login, register, logout, fetchCurrentUser }
})
