import { apiRequest } from '@/api/http'

export interface User {
  id: string
  email: string
  handle: string
  firstName: string | null
  lastName: string | null
  avatar: string | null
}

export interface RegistrationData {
  email: string
  password: string
  firstName: string
  lastName: string
  avatar?: string | null
}

export const getCurrentUser = () => apiRequest<User>('/auth/me')
export const signIn = (email: string, password: string) =>
  apiRequest<User>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
export const register = (data: RegistrationData) =>
  apiRequest<User>('/auth/register', { method: 'POST', body: JSON.stringify(data) })
export const signOut = () => apiRequest<void>('/auth/logout', { method: 'POST' })

export interface ProfileData {
  handle?: string
  firstName: string
  lastName: string
  avatar: string | null
}

export const updateProfile = (data: ProfileData) =>
  apiRequest<User>('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) })

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiRequest<void>('/auth/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })

export const requestPasswordReset = (email: string) =>
  apiRequest<{ message: string }>('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) })
export const checkPasswordReset = (token: string) =>
  apiRequest<{ valid: boolean }>('/auth/password-reset/check', { method: 'POST', body: JSON.stringify({ token }) })
export const resetPassword = (token: string, password: string) =>
  apiRequest<void>('/auth/password-reset', { method: 'POST', body: JSON.stringify({ token, password }) })
