<template>
  <div class="space-y-6">
    <section class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-lg font-bold text-slate-800">公积金非理性提取智能反欺诈与个贷风控</h3>
        <p class="text-sm text-slate-500">异地购房 / 租房 / 大病 / 离职销户交叉比对 · 长三角不动产联网核验</p>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-semibold"
          :class="tab === 'fraud' ? 'bg-rose-700 text-white' : 'border border-slate-200 bg-white text-slate-600'"
          @click="tab = 'fraud'"
        >
          反欺诈预警
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-semibold"
          :class="tab === 'mortgage' ? 'bg-indigo-700 text-white' : 'border border-slate-200 bg-white text-slate-600'"
          @click="tab = 'mortgage'"
        >
          个贷资产监控
        </button>
      </div>
    </section>

    <template v-if="tab === 'fraud'">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="card in fraudKpi" :key="card.label" class="panel-card p-4">
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-2xl font-bold text-slate-900">{{ card.value }}</p>
        </div>
      </section>

      <section class="grid gap-4 xl:grid-cols-3">
        <div class="panel-card p-4 xl:col-span-2">
          <h4 class="mb-3 font-semibold">异地购房提取风险等级评分卡</h4>
          <div ref="scoreRef" class="h-64 w-full" />
        </div>
        <div class="panel-card p-4">
          <h4 class="mb-3 font-semibold">长三角不动产联网核验</h4>
          <ul class="space-y-2 text-xs text-slate-600">
            <li v-for="row in propertyChecks" :key="row.id" class="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p class="font-semibold text-slate-800">{{ row.city }} · {{ row.result }}</p>
              <p class="mt-1 text-slate-500">{{ row.detail }}</p>
            </li>
          </ul>
        </div>
      </section>

      <section class="grid gap-4 lg:grid-cols-3">
        <div class="panel-card overflow-x-auto p-4 lg:col-span-2">
          <h4 class="mb-3 font-semibold">预警工单列表</h4>
          <table class="w-full min-w-[720px] text-left text-sm">
            <thead class="text-xs text-slate-500">
              <tr>
                <th class="py-2">预警号</th>
                <th>申请人</th>
                <th>类型</th>
                <th>金额</th>
                <th>等级</th>
                <th>处置</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="a in alarms"
                :key="a.id"
                class="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                @click="selected = a"
              >
                <td class="py-2 font-mono text-xs">{{ a.alarm_sn }}</td>
                <td>{{ a.applicant_name_masked }}</td>
                <td>{{ categoryLabel(a.extract_category) }}</td>
                <td>¥{{ formatMoney(a.requested_amount_yuan) }}</td>
                <td><span class="metric-chip" :class="levelChip(a.risk_severity_level)">{{ levelLabel(a.risk_severity_level) }}</span></td>
                <td>{{ dispositionLabel(a.disposition_verdict) }}</td>
                <td>
                  <button
                    v-if="a.disposition_verdict === 'PENDING_VERIFY'"
                    class="btn-ghost text-xs"
                    type="button"
                    @click.stop="lockCase(a.alarm_sn)"
                  >
                    锁定欺诈
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <aside class="panel-card p-4">
          <h4 class="mb-3 font-semibold">高危案件锁定抽屉</h4>
          <template v-if="selected">
            <p class="font-mono text-xs text-slate-400">{{ selected.alarm_sn }}</p>
            <p class="mt-1 text-lg font-bold text-slate-800">{{ selected.applicant_name_masked }}</p>
            <p class="mt-1 text-xs text-slate-500">证件 {{ selected.applicant_idcard_masked }}</p>
            <p class="mt-3 rounded-lg bg-rose-50 p-3 text-xs leading-6 text-rose-900">{{ selected.risk_trigger_rule }}</p>
            <dl class="mt-3 space-y-2 text-xs text-slate-600">
              <div class="flex justify-between"><dt>申请金额</dt><dd class="font-semibold">¥{{ formatMoney(selected.requested_amount_yuan) }}</dd></div>
              <div class="flex justify-between"><dt>自动拦截</dt><dd>{{ selected.auto_intercept_status ? '已锁定资金' : '未拦截' }}</dd></div>
              <div class="flex justify-between"><dt>调查员</dt><dd>{{ selected.investigator_name }}</dd></div>
              <div class="flex justify-between"><dt>检出时间</dt><dd>{{ selected.detected_at }}</dd></div>
            </dl>
          </template>
          <p v-else class="text-xs text-slate-400">点击左侧工单查看详情</p>
        </aside>
      </section>
    </template>

    <section v-else class="panel-card p-4">
      <MortgagePanel />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import * as echarts from 'echarts'
import {
  getAntifraudAlarms,
  updateAlarmDisposition,
  type AntifraudAlarm,
} from '@/utils/sqljs-engine'
import { useAuthStore } from '@/stores/auth'
import MortgagePanel from '@/views/mortgage/MortgagePanel.vue'

const auth = useAuthStore()
const tab = ref<'fraud' | 'mortgage'>('fraud')
const alarms = ref<AntifraudAlarm[]>([])
const selected = ref<AntifraudAlarm | null>(null)
const scoreRef = ref<HTMLDivElement | null>(null)
const scoreChart = shallowRef<echarts.ECharts | null>(null)

const propertyChecks = [
  { id: 1, city: '杭州 · 不动产登记', result: '疑似短时过户', detail: '产证持有不足 90 日，命中中介代办关联图谱' },
  { id: 2, city: '苏州 · 民政婚姻', result: '核验通过', detail: '婚姻状态与提取事由一致' },
  { id: 3, city: '上海 · 住房信息', result: '多套关联', detail: '近 12 个月出现 2 次跨城购房提取申请' },
]

const fraudKpi = computed(() => [
  { label: '预警工单', value: `${alarms.value.length} 单` },
  { label: '红色阻断', value: `${alarms.value.filter((a) => a.risk_severity_level === 'LEVEL_RED_INTERCEPT').length} 单` },
  { label: '待核验', value: `${alarms.value.filter((a) => a.disposition_verdict === 'PENDING_VERIFY').length} 单` },
  { label: '已确认欺诈', value: `${alarms.value.filter((a) => a.disposition_verdict === 'CONFIRMED_FRAUD_LOCKED').length} 单` },
])

function formatMoney(n: number) {
  return Number(n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

function categoryLabel(c: string) {
  const map: Record<string, string> = {
    OFF_SITE_PURCHASE: '异地购房',
    RENTAL_DEDUCTION: '租房提取',
    MAJOR_DISEASE: '大病提取',
    LEAVING_CITY_TERMINATE: '离职销户',
  }
  return map[c] || c
}

function levelLabel(l: string) {
  const map: Record<string, string> = {
    LEVEL_LOW_NOTICE: '低风险提示',
    LEVEL_MEDIUM_REVIEW: '中风险复核',
    LEVEL_RED_INTERCEPT: '红色阻断',
  }
  return map[l] || l
}

function levelChip(l: string) {
  if (l === 'LEVEL_RED_INTERCEPT') return 'bg-rose-50 text-rose-700'
  if (l === 'LEVEL_MEDIUM_REVIEW') return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

function dispositionLabel(d: string) {
  const map: Record<string, string> = {
    PENDING_VERIFY: '待核验',
    CONFIRMED_FRAUD_LOCKED: '确认欺诈锁定',
    CLEARED_LEGITIMATE: '已排除',
  }
  return map[d] || d
}

function scoreOf(a: AntifraudAlarm) {
  if (a.risk_severity_level === 'LEVEL_RED_INTERCEPT') return 92
  if (a.risk_severity_level === 'LEVEL_MEDIUM_REVIEW') return 68
  return 35
}

function renderScore() {
  if (!scoreRef.value) return
  if (!scoreChart.value) scoreChart.value = echarts.init(scoreRef.value)
  scoreChart.value.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 40 },
    xAxis: { type: 'category', data: alarms.value.map((a) => a.alarm_sn) },
    yAxis: { type: 'value', max: 100, name: '风险分' },
    series: [
      {
        type: 'bar',
        data: alarms.value.map((a) => ({
          value: scoreOf(a),
          itemStyle: {
            color: a.risk_severity_level === 'LEVEL_RED_INTERCEPT' ? '#e11d48' : a.risk_severity_level === 'LEVEL_MEDIUM_REVIEW' ? '#f59e0b' : '#0d9488',
          },
        })),
        barMaxWidth: 36,
      },
    ],
  })
}

async function lockCase(alarmSn: string) {
  await updateAlarmDisposition(alarmSn, 'CONFIRMED_FRAUD_LOCKED', auth.displayName || '风控岗')
  alarms.value = await getAntifraudAlarms()
  selected.value = alarms.value.find((a) => a.alarm_sn === alarmSn) || null
  await nextTick()
  renderScore()
}

onMounted(async () => {
  alarms.value = await getAntifraudAlarms()
  selected.value = alarms.value[0] || null
  await nextTick()
  renderScore()
  window.addEventListener('resize', () => scoreChart.value?.resize())
})

onUnmounted(() => {
  scoreChart.value?.dispose()
})
</script>
