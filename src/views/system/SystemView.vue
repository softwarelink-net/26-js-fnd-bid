<template>
  <div class="space-y-6">
    <section class="panel-card p-4">
      <h3 class="text-lg font-bold text-slate-800">系统总控与涉密公职人员隐私安全审计</h3>
      <p class="mt-1 text-sm text-slate-500">国密 SM4 列级脱敏 · 平账调账防篡改哈希 · Feature Flags · 等保三级审计穿透</p>
    </section>

    <section class="grid gap-4 lg:grid-cols-3">
      <div class="panel-card p-4 lg:col-span-2">
        <h4 class="mb-3 font-semibold">系统配置 / Feature Flags</h4>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[560px] text-left text-sm">
            <thead class="text-xs text-slate-500">
              <tr>
                <th class="py-2">配置键</th>
                <th>分类</th>
                <th>当前值</th>
                <th>说明</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in configs" :key="c.config_key" class="border-t border-slate-100 align-top">
                <td class="py-2 font-mono text-xs">{{ c.config_key }}</td>
                <td><span class="metric-chip bg-slate-100 text-slate-600">{{ c.category }}</span></td>
                <td class="font-semibold text-teal-700">{{ c.config_value }}</td>
                <td class="max-w-xs text-xs text-slate-500">{{ c.description }}</td>
                <td>
                  <button
                    v-if="c.config_value === 'true' || c.config_value === 'false'"
                    class="btn-ghost text-xs"
                    type="button"
                    @click="flip(c.config_key, c.config_value)"
                  >
                    切换
                  </button>
                  <span v-else class="text-xs text-slate-400">只读</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel-card p-4">
        <h4 class="mb-3 font-semibold">SM4 脱敏演示</h4>
        <div class="space-y-2 text-sm">
          <div class="rounded-lg bg-slate-50 p-3">
            <p class="text-xs text-slate-400">公职人员姓名</p>
            <p class="font-mono">{{ maskOn ? '赵*强' : '赵国强' }}</p>
          </div>
          <div class="rounded-lg bg-slate-50 p-3">
            <p class="text-xs text-slate-400">身份证号</p>
            <p class="font-mono">{{ maskOn ? '320102198405******' : '320102198405121234' }}</p>
          </div>
          <div class="rounded-lg bg-slate-50 p-3">
            <p class="text-xs text-slate-400">公积金余额</p>
            <p class="font-mono">{{ maskOn ? '¥ ***,***.**' : '¥ 458,320.50' }}</p>
          </div>
        </div>
        <p class="mt-3 text-xs text-slate-500">受 FEATURE_SM4_SENSITIVE_MASKING 控制，审计旁路操作将写入 MASK_OVERRIDE 日志。</p>
      </div>
    </section>

    <section class="panel-card overflow-x-auto p-4">
      <h4 class="mb-3 font-semibold">安全审计轨迹 Audit Trail</h4>
      <table class="w-full min-w-[720px] text-left text-sm">
        <thead class="text-xs text-slate-500">
          <tr>
            <th class="py-2">时间</th>
            <th>用户</th>
            <th>动作</th>
            <th>资源</th>
            <th>IP</th>
            <th>URI</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id" class="border-t border-slate-100">
            <td class="py-2 font-mono text-xs">{{ log.created_at }}</td>
            <td>{{ log.username }}</td>
            <td><span class="metric-chip bg-sky-50 text-sky-700">{{ log.action_name }}</span></td>
            <td class="font-mono text-xs">{{ log.target_resource }}</td>
            <td class="font-mono text-xs">{{ log.ip_address }}</td>
            <td class="text-xs text-slate-500">{{ log.request_uri }}</td>
            <td>{{ log.status_code }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  getAuditLogs,
  getSystemConfigs,
  updateSystemConfig,
  type AuditLog,
  type SystemConfig,
} from '@/utils/sqljs-engine'

const configs = ref<SystemConfig[]>([])
const logs = ref<AuditLog[]>([])

const maskOn = computed(() => {
  const cfg = configs.value.find((c) => c.config_key === 'FEATURE_SM4_SENSITIVE_MASKING')
  return !cfg || cfg.config_value === 'true'
})

async function flip(key: string, current: string) {
  await updateSystemConfig(key, current === 'true' ? 'false' : 'true')
  configs.value = await getSystemConfigs()
}

onMounted(async () => {
  configs.value = await getSystemConfigs()
  logs.value = await getAuditLogs()
})
</script>
