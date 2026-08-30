import { apiClient } from '@/api/client'
import type { ApiResponse, User } from '@/types'

export interface RegisterInput {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export interface LoginInput {
  email: string
  password: string
}

export async function register(input: RegisterInput): Promise<User> {
  const { data } = await apiClient.post<ApiResponse<User>>('/auth/register', input)
  return data.data
}

export async function login(
  input: LoginInput,
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  const { data } = await apiClient.post<
    ApiResponse<{ access_token: string; token_type: string; expires_in: number }>
  >('/auth/login', input)
  return data.data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}

export async function me(): Promise<User> {
  const { data } = await apiClient.get<ApiResponse<User>>('/auth/me')
  return data.data
}
