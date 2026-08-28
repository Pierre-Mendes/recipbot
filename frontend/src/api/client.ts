import axios from 'axios'

import { getToken } from '@/utils/auth'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export const apiClient = axios.create({ baseURL })

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Imported lazily (not at module top-level) to avoid a load-order
      // problem with the store's own client.ts -> api/auth.ts -> client.ts
      // import cycle.
      const { useAuthStore } = await import('@/stores/auth')
      useAuthStore().clearSession()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)
