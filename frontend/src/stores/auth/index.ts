import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCurrentUser, register, signIn, signOut, updateProfile, type RegistrationData, type ProfileData, type User } from '@/api/auth'
import { ApiError } from '@/api/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const ready = ref(false)
  const loading = ref(false)
  const error = ref('')

  async function restore() {
    ready.value = false
    error.value = ''
    try {
      user.value = await getCurrentUser()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) user.value = null
      else error.value = 'Не удалось подключиться к серверу. Попробуй снова.'
    } finally {
      ready.value = true
    }
  }

  async function authenticate(email: string, password: string, profile?: Omit<RegistrationData, 'email' | 'password'>) {
    if (loading.value) return
    loading.value = true
    try {
      user.value = await (profile ? register({ email, password, ...profile }) : signIn(email, password))
    } finally {
      loading.value = false
    }
  }

  async function saveProfile(data: ProfileData) {
    user.value = await updateProfile(data)
  }

  async function logout() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    try {
      await signOut()
      user.value = null
    } catch {
      error.value = 'Не удалось выйти. Попробуй снова.'
    } finally {
      loading.value = false
    }
  }

  function expire() {
    user.value = null
  }

  return { user, ready, loading, error, restore, authenticate, saveProfile, logout, expire }
})
