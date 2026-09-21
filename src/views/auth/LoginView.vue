<template>
  <AuthLayout>
    <div class="mx-auto w-full max-w-md panel-card p-6 md:p-8">
      <div class="mb-6 text-center">
        <p class="text-xs font-semibold uppercase tracking-widest text-teal-600">身份鉴权</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-800">资金中心人员登录</h2>
        <p class="mt-2 text-sm text-slate-500">本地 SQLite 边缘鉴权 · 会话内存持久化</p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">登录账号</span>
          <input
            v-model="form.username"
            class="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none ring-sky-500 focus:ring-2"
            autocomplete="username"
            placeholder="admin / director / ops_user / leader"
            required
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">登录密码</span>
          <input
            v-model="form.password"
            type="password"
            class="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none ring-sky-500 focus:ring-2"
            autocomplete="current-password"
            placeholder="请输入演示密码"
            required
          />
        </label>
        <p v-if="auth.authError" class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{{ auth.authError }}</p>
        <button class="btn-primary w-full py-2.5" type="submit" :disabled="loading">
          {{ loading ? '鉴权中…' : '进入资金运营控制台' }}
        </button>
      </form>

      <div class="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <p class="font-semibold text-slate-700">快速填充演示账号</p>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button
            v-for="acc in accounts"
            :key="acc.username"
            type="button"
            class="rounded border border-slate-200 bg-white px-2 py-1.5 text-left hover:border-sky-300"
            @click="fill(acc)"
          >
            <span class="block font-medium">{{ acc.label }}</span>
            <span class="text-[10px] text-slate-400">{{ acc.username }}</span>
          </button>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const loading = ref(false)

const form = reactive({
  username: 'admin',
  password: 'Admin@2026',
})

const accounts = [
  { label: '系统超管', username: 'admin', password: 'Admin@2026' },
  { label: '财务风控', username: 'director', password: 'Director@2026' },
  { label: '外包运维', username: 'ops_user', password: 'Ops@2026' },
  { label: '决策长官', username: 'leader', password: 'Leader@2026' },
]

function fill(acc: { username: string; password: string }) {
  form.username = acc.username
  form.password = acc.password
}

async function submit() {
  loading.value = true
  try {
    await auth.login(form.username, form.password)
    const redirect = (route.query.redirect as string) || '/'
    await router.replace(redirect)
  } catch {
    /* handled in store */
  } finally {
    loading.value = false
  }
}
</script>
