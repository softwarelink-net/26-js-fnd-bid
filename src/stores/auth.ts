import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  getSession,
  login as engineLogin,
  logout as engineLogout,
  type JsfndUser,
  type UserRole,
} from '@/utils/sqljs-engine'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<JsfndUser | null>(getSession())
  const authError = ref('')

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => user.value?.role ?? null)
  const displayName = computed(() => user.value?.full_name ?? '未登录')

  async function login(username: string, password: string) {
    authError.value = ''
    try {
      user.value = await engineLogin(username, password)
      return user.value
    } catch (e) {
      authError.value = e instanceof Error ? e.message : '登录失败'
      throw e
    }
  }

  function logout() {
    engineLogout()
    user.value = null
  }

  function hasRole(roles?: UserRole[]) {
    if (!roles || roles.length === 0) return true
    if (!user.value) return false
    return roles.includes(user.value.role)
  }

  function restore() {
    user.value = getSession()
  }

  return {
    user,
    authError,
    isAuthenticated,
    role,
    displayName,
    login,
    logout,
    hasRole,
    restore,
  }
})
