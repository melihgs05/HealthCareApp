import { httpClient } from './httpClient'
import type { ApiResponse, AuthUser, AuthResponse, LoginPayload, SignupPayload } from './types'

export async function login(payload: LoginPayload): Promise<AuthResponse['data']> {
  const res = await httpClient.post<AuthResponse>('/auth/login', payload)
  return res.data.data
}

export async function signup(payload: SignupPayload): Promise<AuthResponse['data']> {
  const res = await httpClient.post<AuthResponse>('/auth/signup', payload)
  return res.data.data
}

export async function logout(): Promise<void> {
  await httpClient.post('/auth/logout')
}

export async function getCurrentUser(): Promise<AuthUser> {
  const res = await httpClient.get<ApiResponse<AuthUser>>('/auth/me')
  return res.data.data
}
