import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/utils/sqljs-engine'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: UserRole[]
    title?: string
    layout?: 'auth' | 'main'
  }
}

const ALL_ROLES: UserRole[] = [
  'ROLE_SUPER_ADMIN',
  'ROLE_FINANCE_DIRECTOR',
  'ROLE_OPS_ENGINEER',
  'ROLE_DECISION_MAKER',
]

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false, title: '登录鉴权', layout: 'auth' },
  },
  {
    path: '/tender',
    name: 'tender',
    component: () => import('@/views/auth/TenderView.vue'),
    meta: { requiresAuth: false, title: '公开招标公告', layout: 'auth' },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: {
          requiresAuth: true,
          roles: ALL_ROLES,
          title: '住房资金全景运营大屏',
        },
      },
      {
        path: 'collection',
        name: 'collection',
        component: () => import('@/views/collection/CollectionView.vue'),
        meta: {
          requiresAuth: true,
          roles: ['ROLE_SUPER_ADMIN', 'ROLE_FINANCE_DIRECTOR', 'ROLE_OPS_ENGINEER'],
          title: '机关资金归集与单位账户中枢',
        },
      },
      {
        path: 'reconciliation',
        name: 'reconciliation',
        component: () => import('@/views/reconciliation/ReconciliationView.vue'),
        meta: {
          requiresAuth: true,
          roles: ['ROLE_SUPER_ADMIN', 'ROLE_FINANCE_DIRECTOR', 'ROLE_OPS_ENGINEER'],
          title: '银企直联对账与清算结算中心',
        },
      },
      {
        path: 'anti-fraud',
        name: 'anti-fraud',
        component: () => import('@/views/anti-fraud/AntiFraudView.vue'),
        meta: {
          requiresAuth: true,
          roles: ['ROLE_SUPER_ADMIN', 'ROLE_FINANCE_DIRECTOR', 'ROLE_OPS_ENGINEER', 'ROLE_DECISION_MAKER'],
          title: '公积金反欺诈与个贷资产风控',
        },
      },
      {
        path: 'system',
        name: 'system',
        component: () => import('@/views/system/SystemView.vue'),
        meta: {
          requiresAuth: true,
          roles: ['ROLE_SUPER_ADMIN', 'ROLE_FINANCE_DIRECTOR', 'ROLE_DECISION_MAKER'],
          title: '系统总控与等保安全审计',
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.restore()

  const isPublic = to.matched.some((r) => r.meta.requiresAuth === false)
  if (isPublic) {
    if (auth.isAuthenticated && to.name === 'login') {
      return { name: 'dashboard' }
    }
    return true
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const roles = to.meta.roles as UserRole[] | undefined
  if (roles && !auth.hasRole(roles)) {
    window.alert('当前角色无权访问该模块，请联系资金中心技术科或财务核算科开通权限。')
    return { name: 'dashboard' }
  }

  return true
})

export default router
