<template>
  <div class="space-y-6">
    <section class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-lg font-bold text-slate-800">省级机关住房资金归集与账户全息中枢</h3>
        <p class="text-sm text-slate-500">纳管省机关、高校、三甲医院等缴存单位 · 月度汇缴 / 补缴 / 封存状态</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in natureOptions"
          :key="opt.value"
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-semibold"
          :class="filterNature === opt.value ? 'bg-sky-700 text-white' : 'bg-white text-slate-600 border border-slate-200'"
          @click="filterNature = opt.value"
        >
          {{ opt.label }}
        </button>
        <button class="btn-primary text-xs" type="button" @click="simulateBatch">模拟批量扣缴</button>
      </div>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="card in summaryCards" :key="card.label" class="panel-card p-4">
        <p class="text-xs text-slate-500">{{ card.label }}</p>
        <p class="mt-2 text-2xl font-bold text-slate-900">{{ card.value }}</p>
        <p class="mt-1 text-xs text-teal-700">{{ card.hint }}</p>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-3">
      <div class="panel-card p-4 xl:col-span-2">
        <h4 class="mb-3 font-semibold text-slate-800">月度公积金与住房补贴归集对比</h4>
        <div ref="chartRef" class="h-72 w-full" />
      </div>
      <div class="panel-card p-4">
        <h4 class="mb-3 font-semibold text-slate-800">批量扣缴执行台</h4>
        <ul class="space-y-2 text-sm">
          <li v-for="log in batchLogs" :key="log" class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{{ log }}</li>
        </ul>
        <p v-if="!batchLogs.length" class="text-xs text-slate-400">点击「模拟批量扣缴」生成执行日志</p>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="unit in filteredUnits"
        :key="unit.id"
        class="panel-card p-4"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-semibold text-slate-800">{{ unit.unit_name }}</p>
            <p class="mt-1 font-mono text-[11px] text-slate-400">{{ unit.unit_account_no }}</p>
          </div>
          <span class="metric-chip" :class="statusChip(unit.account_status)">{{ statusLabel(unit.account_status) }}</span>
        </div>
        <dl class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div>
            <dt class="text-slate-400">单位性质</dt>
            <dd class="font-medium">{{ natureLabel(unit.unit_nature) }}</dd>
          </div>
          <div>
            <dt class="text-slate-400">缴存人数</dt>
            <dd class="font-medium">{{ unit.active_employees_count }} 人</dd>
          </div>
          <div>
            <dt class="text-slate-400">缴存比例</dt>
            <dd class="font-medium">{{ unit.deposit_ratio_pct }}%</dd>
          </div>
          <div>
            <dt class="text-slate-400">最近汇缴月</dt>
            <dd class="font-medium">{{ unit.last_deposited_month }}</dd>
          </div>
        </dl>
        <p class="mt-3 text-lg font-bold text-sky-800">¥ {{ formatMoney(unit.monthly_collection_amount) }}</p>
        <p class="text-[11px] text-slate-400">月度汇缴总额</p>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import { getContributionUnits, type ContributionUnit } from '@/utils/sqljs-engine'

const units = ref<ContributionUnit[]>([])
const filterNature = ref('')
const batchLogs = ref<string[]>([])
const chartRef = ref<HTMLDivElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)

const natureOptions = [
  { value: '', label: '全部单位' },
  { value: 'STATE_GOV_ORGAN', label: '行政机关' },
  { value: 'PUBLIC_INSTITUTION', label: '事业单位' },
  { value: 'SOE_ENTERPRISE', label: '省属国企' },
]

const filteredUnits = computed(() =>
  filterNature.value ? units.value.filter((u) => u.unit_nature === filterNature.value) : units.value,
)

const summaryCards = computed(() => {
  const list = filteredUnits.value
  const total = list.reduce((s, u) => s + Number(u.monthly_collection_amount), 0)
  const employees = list.reduce((s, u) => s + Number(u.active_employees_count), 0)
  const frozen = list.filter((u) => u.account_status !== 'ACTIVE_NORMAL').length
  return [
    { label: '纳管单位数', value: `${list.length} 家`, hint: '省级机关事业单位与国企' },
    { label: '缴存职工', value: `${employees.toLocaleString()} 人`, hint: '在册正常缴存口径' },
    { label: '月度汇缴规模', value: `¥ ${formatMoney(total)}`, hint: '含公积金与住房补贴' },
    { label: '异常账户', value: `${frozen} 户`, hint: '冻结 / 封存状态' },
  ]
})

function formatMoney(n: number) {
  return Number(n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

function natureLabel(n: string) {
  const map: Record<string, string> = {
    STATE_GOV_ORGAN: '行政机关',
    PUBLIC_INSTITUTION: '事业单位',
    SOE_ENTERPRISE: '省属国企',
  }
  return map[n] || n
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    ACTIVE_NORMAL: '正常汇缴',
    SUSPENDED_FROZEN: '冻结',
    SEALED_CLOSED: '封存',
  }
  return map[s] || s
}

function statusChip(s: string) {
  if (s === 'ACTIVE_NORMAL') return 'bg-emerald-50 text-emerald-700'
  if (s === 'SUSPENDED_FROZEN') return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

function renderChart() {
  if (!chartRef.value) return
  if (!chart.value) chart.value = echarts.init(chartRef.value)
  const names = filteredUnits.value.map((u) => u.unit_name.replace(/机关|教职工账户|职工账户/g, '').slice(0, 10))
  const gjj = filteredUnits.value.map((u) => Math.round(Number(u.monthly_collection_amount) * 0.78))
  const subsidy = filteredUnits.value.map((u) => Math.round(Number(u.monthly_collection_amount) * 0.22))
  chart.value.setOption({
    color: ['#0369a1', '#0d9488'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['公积金汇缴', '住房补贴'] },
    grid: { left: 50, right: 20, top: 40, bottom: 60 },
    xAxis: { type: 'category', data: names, axisLabel: { rotate: 25, fontSize: 10 } },
    yAxis: { type: 'value', name: '元' },
    series: [
      { name: '公积金汇缴', type: 'bar', stack: 'total', data: gjj, barMaxWidth: 36 },
      { name: '住房补贴', type: 'bar', stack: 'total', data: subsidy, barMaxWidth: 36 },
    ],
  })
}

function simulateBatch() {
  const now = new Date().toLocaleTimeString('zh-CN')
  const targets = filteredUnits.value.filter((u) => u.account_status === 'ACTIVE_NORMAL').slice(0, 3)
  batchLogs.value = [
    `[${now}] 启动批量代扣任务 BATCH-JS-${Date.now().toString().slice(-6)}`,
    ...targets.map((u) => `[${now}] 扣缴成功 ${u.unit_account_no} ¥${formatMoney(u.monthly_collection_amount)}`),
    `[${now}] 任务完成，成功 ${targets.length} 笔，失败 0 笔`,
  ]
}

watch(filteredUnits, async () => {
  await nextTick()
  renderChart()
})

onMounted(async () => {
  units.value = await getContributionUnits()
  await nextTick()
  renderChart()
  window.addEventListener('resize', () => chart.value?.resize())
})

onUnmounted(() => {
  chart.value?.dispose()
})
</script>
