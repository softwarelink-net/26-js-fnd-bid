<template>
  <div class="main-shell flex min-h-[calc(100vh-40px)] bg-slate-100/90">
    <aside
      class="sidebar hidden w-64 shrink-0 flex-col border-r border-slate-800/40 bg-gradient-to-b from-[#1e1b4b] via-[#082f49] to-[#0f766e] text-cyan-50 md:flex"
    >
      <div class="border-b border-white/10 px-5 py-5">
        <p class="text-[11px] tracking-widest text-cyan-200/70">JSFND · FUND COMMAND</p>
        <h1 class="mt-1 text-base font-bold leading-snug">省级机关住房资金<br />综合运营监控台</h1>
      </div>
      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <RouterLink
          v-for="item in visibleMenus"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
        >
          <span class="nav-dot" />
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="border-t border-white/10 px-4 py-4 text-xs text-cyan-100/70">
        <p>{{ auth.displayName }}</p>
        <p class="mt-1 font-mono text-[10px] text-cyan-200/60">{{ auth.role }}</p>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-10 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div>
            <p class="text-xs text-slate-500">{{ breadcrumb }}</p>
            <h2 class="text-lg font-bold text-slate-800">{{ pageTitle }}</h2>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="metric-chip bg-emerald-50 text-emerald-700">专线心跳 {{ heartbeatOk }}/4</span>
            <span class="metric-chip bg-sky-50 text-sky-700">日终平账 {{ stats.balancedBatches }} 批</span>
            <span class="metric-chip bg-rose-50 text-rose-700">套提预警 {{ stats.pendingAlarms }}</span>
            <button class="btn-ghost" type="button" @click="onLogout">退出</button>
          </div>
        </div>
        <div class="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-2 md:hidden">
          <RouterLink
            v-for="item in visibleMenus"
            :key="item.to"
            :to="item.to"
            class="whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium"
            :class="isActive(item.to) ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'"
          >
            {{ item.label }}
          </RouterLink>
        </div>
      </header>

      <main class="flex-1 overflow-auto p-4 md:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getDashboardStats, type UserRole } from '@/utils/sqljs-engine'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const stats = reactive({
  balancedBatches: 0,
  pendingAlarms: 0,
  unbalancedBatches: 0,
})
const heartbeatOk = 3

const menus: Array<{ to: string; label: string; roles: UserRole[] }> = [
  {
    to: '/',
    label: '运营态势大屏',
    roles: ['ROLE_SUPER_ADMIN', 'ROLE_FINANCE_DIRECTOR', 'ROLE_OPS_ENGINEER', 'ROLE_DECISION_MAKER'],
  },
  {
    to: '/collection',
    label: '资金归集中枢',
    roles: ['ROLE_SUPER_ADMIN', 'ROLE_FINANCE_DIRECTOR', 'ROLE_OPS_ENGINEER'],
  },
  {
    to: '/reconciliation',
    label: '银企直联对账',
    roles: ['ROLE_SUPER_ADMIN', 'ROLE_FINANCE_DIRECTOR', 'ROLE_OPS_ENGINEER'],
  },
  {
    to: '/anti-fraud',
    label: '反欺诈与个贷',
    roles: ['ROLE_SUPER_ADMIN', 'ROLE_FINANCE_DIRECTOR', 'ROLE_OPS_ENGINEER', 'ROLE_DECISION_MAKER'],
  },
  {
    to: '/system',
    label: '系统总控审计',
    roles: ['ROLE_SUPER_ADMIN', 'ROLE_FINANCE_DIRECTOR', 'ROLE_DECISION_MAKER'],
  },
]

const visibleMenus = computed(() => menus.filter((m) => auth.hasRole(m.roles)))
const pageTitle = computed(() => (route.meta.title as string) || '住房资金管控')
const breadcrumb = computed(() => `首页 / ${pageTitle.value}`)

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function onLogout() {
  auth.logout()
  router.push({ name: 'login' })
}

onMounted(async () => {
  try {
    const data = await getDashboardStats()
    stats.balancedBatches = data.balancedBatches
    stats.pendingAlarms = data.pendingAlarms
    stats.unbalancedBatches = data.unbalancedBatches
  } catch {
    /* ignore until db ready */
  }
})
</script>

<style scoped>
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(224, 242, 254, 0.78);
  transition: background 0.15s ease, color 0.15s ease;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.nav-item.active {
  background: rgba(56, 189, 248, 0.18);
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(125, 211, 252, 0.25);
}
.nav-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(125, 211, 252, 0.45);
}
.nav-item.active .nav-dot {
  background: #38bdf8;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.8);
}
.sidebar {
  display: none;
}
@media (min-width: 768px) {
  .sidebar {
    display: flex;
  }
}
</style>
