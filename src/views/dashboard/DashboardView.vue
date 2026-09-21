<template>
  <div class="space-y-6">
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="card in kpiCards" :key="card.label" class="panel-card p-4">
        <p class="text-xs font-medium text-slate-500">{{ card.label }}</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{{ card.value }}<span class="ml-1 text-sm font-medium text-slate-400">{{ card.unit }}</span></p>
        <p class="mt-1 text-xs text-teal-700">{{ card.hint }}</p>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-3">
      <div class="panel-card p-4 xl:col-span-2">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="font-bold text-slate-800">月度归集与提取现金流双轴走势</h3>
          <span class="text-xs text-slate-400">ECharts · 亿元</span>
        </div>
        <div ref="trendRef" class="h-72 w-full" />
      </div>
      <div class="panel-card p-4">
        <h3 class="mb-3 font-bold text-slate-800">商业银行沉淀资金分布</h3>
        <div ref="pieRef" class="h-72 w-full" />
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-3">
      <div class="panel-card p-4">
        <h3 class="mb-3 font-bold text-slate-800">个贷逾期与不良率雷达</h3>
        <div ref="radarRef" class="h-72 w-full" />
      </div>
      <div class="panel-card p-4 xl:col-span-2">
        <h3 class="mb-3 font-bold text-slate-800">外包运维 SLA 与实时告警滚动</h3>
        <div class="mb-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-teal-200 bg-teal-50/70 p-3">
            <p class="text-xs text-teal-700">SLA 达标率</p>
            <p class="mt-1 text-2xl font-bold text-teal-900">{{ stats.opsSlaPct }}%</p>
          </div>
          <div class="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
            <p class="text-xs text-sky-700">平均响应</p>
            <p class="mt-1 text-2xl font-bold text-sky-900">{{ stats.avgResponseMinutes }} min</p>
          </div>
          <div class="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <p class="text-xs text-amber-700">备付金保证率</p>
            <p class="mt-1 text-2xl font-bold text-amber-900">{{ stats.liquidityBackupPct }}%</p>
          </div>
        </div>
        <ul class="divide-y divide-slate-100">
          <li v-for="item in alertFeed" :key="item.id" class="flex items-start justify-between gap-3 py-3 text-sm">
            <div>
              <p class="font-semibold text-slate-800">{{ item.title }}</p>
              <p class="text-xs text-slate-500">{{ item.detail }}</p>
            </div>
            <span class="metric-chip" :class="item.tone">{{ item.tag }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      <div class="panel-card p-4">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="font-bold text-slate-800">Feature Flags 业务开关</h3>
          <span class="text-xs text-slate-400">一键动态切换</span>
        </div>
        <div class="space-y-3">
          <label
            v-for="cfg in flagConfigs"
            :key="cfg.config_key"
            class="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3"
          >
            <div>
              <p class="text-sm font-semibold text-slate-800">{{ cfg.config_key }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ cfg.description }}</p>
            </div>
            <input
              type="checkbox"
              class="mt-1 h-4 w-4 accent-teal-600"
              :checked="cfg.config_value === 'true'"
              :disabled="cfg.config_key === 'LIQUIDITY_BACKUP_ALERT_PCT'"
              @change="toggleFlag(cfg.config_key, ($event.target as HTMLInputElement).checked)"
            />
          </label>
        </div>
      </div>
      <div class="panel-card p-4">
        <h3 class="mb-3 font-bold text-slate-800">资金池流动性备付仪表</h3>
        <div ref="gaugeRef" class="h-64 w-full" />
        <p class="mt-2 text-center text-xs text-slate-500">
          资金池总资产约 ¥{{ formatYi(stats.totalPoolAssetYuan) }} 亿元 · 纳管单位 {{ stats.unitCount }} 家 · 职工 {{ stats.activeEmployees.toLocaleString() }} 人
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import * as echarts from 'echarts'
import {
  getDashboardStats,
  getSystemConfigs,
  updateSystemConfig,
  type DashboardStats,
  type SystemConfig,
} from '@/utils/sqljs-engine'

const trendRef = ref<HTMLDivElement | null>(null)
const pieRef = ref<HTMLDivElement | null>(null)
const radarRef = ref<HTMLDivElement | null>(null)
const gaugeRef = ref<HTMLDivElement | null>(null)
const trendChart = shallowRef<echarts.ECharts | null>(null)
const pieChart = shallowRef<echarts.ECharts | null>(null)
const radarChart = shallowRef<echarts.ECharts | null>(null)
const gaugeChart = shallowRef<echarts.ECharts | null>(null)

const stats = ref<DashboardStats>({
  totalPoolAssetYuan: 0,
  monthlyCollectionYuan: 0,
  monthlyExtractYuan: 0,
  liquidityBackupPct: 0,
  unitCount: 0,
  activeEmployees: 0,
  balancedBatches: 0,
  unbalancedBatches: 0,
  redAlarms: 0,
  pendingAlarms: 0,
  overdueLoanCount: 0,
  overdueRatePct: 0,
  opsSlaPct: 0,
  avgResponseMinutes: 0,
  bankDepositDistribution: [],
  cashflowTrend: [],
  riskRadar: [],
})
const configs = ref<SystemConfig[]>([])

const flagConfigs = computed(() =>
  configs.value.filter(
    (c) => c.config_key.startsWith('FEATURE_') || c.config_key === 'LIQUIDITY_BACKUP_ALERT_PCT',
  ),
)

const kpiCards = computed(() => [
  { label: '资金池总资产', value: formatYi(stats.value.totalPoolAssetYuan), unit: '亿元', hint: '含公积金与住房补贴沉淀' },
  { label: '本月归集规模', value: (stats.value.monthlyCollectionYuan / 1e8).toFixed(2), unit: '亿元', hint: '全省省级机关汇缴' },
  { label: '个贷逾期率', value: stats.value.overdueRatePct, unit: '%', hint: `逾期合同 ${stats.value.overdueLoanCount} 笔` },
  { label: '红色套提阻断', value: stats.value.redAlarms, unit: '单', hint: `待核验 ${stats.value.pendingAlarms} 单` },
])

const alertFeed = computed(() => [
  {
    id: 1,
    title: '建行汉中门支行日终平账完成',
    detail: 'REC-JS-202609-001 差额 0.00，1450 笔清算闭环',
    tag: '平账',
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 2,
    title: '异地购房套提自动拦截',
    detail: 'AF-JS-2026-088 已红色阻断并锁定资金',
    tag: '反欺诈',
    tone: 'bg-rose-50 text-rose-700',
  },
  {
    id: 3,
    title: '江苏银行长短款待签批',
    detail: 'REC-JS-202609-004 差额 1800 元，待财务科长核准',
    tag: '对账',
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    id: 4,
    title: '外包巡检 SLA 达标',
    detail: `核心库 IO 负载正常，平均响应 ${stats.value.avgResponseMinutes} 分钟`,
    tag: '运维',
    tone: 'bg-sky-50 text-sky-700',
  },
])

function formatYi(n: number) {
  return (Number(n || 0) / 1e8).toFixed(2)
}

async function toggleFlag(key: string, on: boolean) {
  if (key === 'LIQUIDITY_BACKUP_ALERT_PCT') return
  await updateSystemConfig(key, on ? 'true' : 'false')
  configs.value = await getSystemConfigs()
}

function renderCharts() {
  if (trendRef.value) {
    trendChart.value = echarts.init(trendRef.value)
    const labels = stats.value.cashflowTrend.map((d) => d.label)
    trendChart.value.setOption({
      color: ['#0369a1', '#0d9488'],
      tooltip: { trigger: 'axis' },
      legend: { data: ['归集', '提取'] },
      grid: { left: 40, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value', name: '亿元' },
      series: [
        { name: '归集', type: 'line', smooth: true, data: stats.value.cashflowTrend.map((d) => d.collection) },
        { name: '提取', type: 'line', smooth: true, data: stats.value.cashflowTrend.map((d) => d.extract) },
      ],
    })
  }

  if (pieRef.value) {
    pieChart.value = echarts.init(pieRef.value)
    pieChart.value.setOption({
      color: ['#0369a1', '#0d9488', '#1e1b4b', '#38bdf8'],
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c}' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '68%'],
          data: stats.value.bankDepositDistribution.map((d) => ({ name: d.bank, value: d.amount })),
          label: { formatter: '{b}\n{d}%' },
        },
      ],
    })
  }

  if (radarRef.value) {
    radarChart.value = echarts.init(radarRef.value)
    radarChart.value.setOption({
      tooltip: {},
      radar: {
        indicator: stats.value.riskRadar.map((r) => ({ name: r.name, max: 100 })),
        radius: '65%',
      },
      series: [
        {
          type: 'radar',
          data: [{ value: stats.value.riskRadar.map((r) => r.value), name: '运营健康度', areaStyle: { opacity: 0.2 } }],
          lineStyle: { color: '#0369a1' },
          itemStyle: { color: '#0d9488' },
        },
      ],
    })
  }

  if (gaugeRef.value) {
    gaugeChart.value = echarts.init(gaugeRef.value)
    gaugeChart.value.setOption({
      series: [
        {
          type: 'gauge',
          min: 0,
          max: 40,
          splitNumber: 8,
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [0.375, '#e11d48'],
                [0.5, '#f59e0b'],
                [1, '#0d9488'],
              ],
            },
          },
          pointer: { width: 4 },
          detail: { formatter: '{value}%', fontSize: 18, offsetCenter: [0, '70%'] },
          data: [{ value: stats.value.liquidityBackupPct, name: '备付率' }],
        },
      ],
    })
  }
}

function onResize() {
  trendChart.value?.resize()
  pieChart.value?.resize()
  radarChart.value?.resize()
  gaugeChart.value?.resize()
}

onMounted(async () => {
  stats.value = await getDashboardStats()
  configs.value = await getSystemConfigs()
  await nextTick()
  renderCharts()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  trendChart.value?.dispose()
  pieChart.value?.dispose()
  radarChart.value?.dispose()
  gaugeChart.value?.dispose()
})
</script>
