import { apiClient } from '@/api/client'
import type { LoginResponse, User } from '@/types'

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
  const { data } = await apiClient.post<{ data: User; message: string }>('/auth/register', input)
  return data.data
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', input)
  return data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}

export async function me(): Promise<User> {
  const { data } = await apiClient.get<{ data: User }>('/auth/me')
  return data.data
}
