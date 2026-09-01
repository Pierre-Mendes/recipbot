import { defineStore } from 'pinia'
import { ref } from 'vue'

import * as authApi from '@/api/auth'
import type { User } from '@/types'
import { getToken, removeToken, setToken } from '@/utils/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // A ref driven explicitly by login/logout/clearSession, not a
  // computed(() => Boolean(getToken())): localStorage isn't a reactive Vue
  // source, so a computed reading it directly never re-evaluates after its
  // first access and would get permanently stuck on whatever it saw first
  // (e.g. cached `false` from the router guard's pre-login check, silently
  // bouncing an just-logged-in user back to /login).
  const isAuthenticated = ref(Boolean(getToken()))

  async function login(email: string, password: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await authApi.login({ email, password })
      setToken(response.access_token)
      isAuthenticated.value = true
      await fetchCurrentUser()
    } catch (e) {
      // If login stored a token but a later step (e.g. fetchCurrentUser) failed,
      // drop the half-established session so guards and the navbar don't treat
      // the user as authenticated while the login page reports failure.
      clearSession()
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
      clearSession()
    }
  }

  /** Drops the local session without calling the API - used by the 401 response interceptor. */
  function clearSession(): void {
    removeToken()
    isAuthenticated.value = false
    user.value = null
  }

  async function fetchCurrentUser(): Promise<void> {
    if (!getToken()) return
    user.value = await authApi.me()
  }

  async function updateProfile(input: authApi.UpdateProfileInput): Promise<void> {
    user.value = await authApi.updateProfile(input)
  }

  async function changePassword(input: authApi.UpdatePasswordInput): Promise<void> {
    await authApi.updatePassword(input)
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

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    fetchCurrentUser,
    updateProfile,
    changePassword,
    clearSession,
  }
})
