import axios from 'axios'

import { getToken } from '@/utils/auth'
import type { ApiValidationError } from '@/types'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export const apiClient = axios.create({ baseURL })

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `******
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { useAuthStore } = await import('@/stores/auth')
      useAuthStore().clearSession()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
      return Promise.reject(error)
    }

    if (error.response?.status !== 422) {
      const { useUiStore } = await import('@/stores/ui')
      const message =
        (error.response?.data as ApiValidationError | undefined)?.message ?? 'Request failed. Try again.'
      useUiStore().notify(message, 'error')
    }

    return Promise.reject(error)
  },
)
