<template>
  <div class="space-y-6">
    <section class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-lg font-bold text-slate-800">多银行银企直联实时清算与日终自动对账工坊</h3>
        <p class="text-sm text-slate-500">工行 / 建行 / 中行 / 江苏银行前置专线 · 长短款自动对齐与冲正</p>
      </div>
      <button class="btn-primary text-xs" type="button" @click="generateReport">生成日结报表</button>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="card in kpi" :key="card.label" class="panel-card p-4">
        <p class="text-xs text-slate-500">{{ card.label }}</p>
        <p class="mt-2 text-2xl font-bold text-slate-900">{{ card.value }}</p>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-3">
      <div class="panel-card p-4 xl:col-span-2">
        <h4 class="mb-3 font-semibold">长短款差额平账温度计</h4>
        <div ref="thermoRef" class="h-72 w-full" />
      </div>
      <div class="panel-card p-4">
        <h4 class="mb-3 font-semibold">冲正模拟器</h4>
        <p class="mb-3 text-xs text-slate-500">选择存在差额的批次，执行一键毫秒级自动冲正。</p>
        <select v-model="selectedBatch" class="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">请选择对账批次</option>
          <option v-for="r in gapRecords" :key="r.id" :value="r.batch_no">
            {{ r.batch_no }} · 差额 ¥{{ formatMoney(r.difference_gap_amount) }}
          </option>
        </select>
        <button class="btn-primary w-full" type="button" :disabled="!selectedBatch || reversing" @click="doReversal">
          {{ reversing ? '冲正中…' : '执行自动冲正' }}
        </button>
        <p v-if="reversalMsg" class="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{{ reversalMsg }}</p>
        <p v-if="dayReport" class="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 whitespace-pre-wrap">{{ dayReport }}</p>
      </div>
    </section>

    <section class="panel-card overflow-x-auto p-4">
      <h4 class="mb-3 font-semibold">对账批次明细</h4>
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead class="text-xs text-slate-500">
          <tr>
            <th class="py-2">批次号</th>
            <th>银行</th>
            <th>对账日</th>
            <th>笔数</th>
            <th>中心账面</th>
            <th>银行回单</th>
            <th>差额</th>
            <th>结论</th>
            <th>经办</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="r.id" class="border-t border-slate-100">
            <td class="py-2 font-mono text-xs">{{ r.batch_no }}</td>
            <td>{{ r.bank_name }}</td>
            <td>{{ r.reconciled_date }}</td>
            <td>{{ r.total_tx_count }}</td>
            <td>¥{{ formatMoney(r.center_recorded_amount) }}</td>
            <td>¥{{ formatMoney(r.bank_statement_amount) }}</td>
            <td :class="r.difference_gap_amount ? 'font-semibold text-rose-600' : 'text-emerald-600'">
              ¥{{ formatMoney(r.difference_gap_amount) }}
            </td>
            <td><span class="metric-chip" :class="verdictChip(r.reconciliation_verdict)">{{ verdictLabel(r.reconciliation_verdict) }}</span></td>
            <td>{{ r.handler_staff_name }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import * as echarts from 'echarts'
import {
  executeReversal,
  getReconciliationRecords,
  type ReconciliationRecord,
} from '@/utils/sqljs-engine'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const records = ref<ReconciliationRecord[]>([])
const selectedBatch = ref('')
const reversing = ref(false)
const reversalMsg = ref('')
const dayReport = ref('')
const thermoRef = ref<HTMLDivElement | null>(null)
const thermoChart = shallowRef<echarts.ECharts | null>(null)

const gapRecords = computed(() =>
  records.value.filter((r) => Number(r.difference_gap_amount) !== 0 || r.reconciliation_verdict === 'UNBALANCED_GAP'),
)

const kpi = computed(() => {
  const totalAmt = records.value.reduce((s, r) => s + Number(r.total_tx_amount), 0)
  const gap = records.value.reduce((s, r) => s + Math.abs(Number(r.difference_gap_amount)), 0)
  const ok = records.value.filter((r) => r.reconciliation_verdict === 'BALANCED_OK').length
  return [
    { label: '对账批次', value: `${records.value.length} 批` },
    { label: '清算总额', value: `¥${formatMoney(totalAmt)}` },
    { label: '平账批次', value: `${ok} 批` },
    { label: '累计差额绝对值', value: `¥${formatMoney(gap)}` },
  ]
})

function formatMoney(n: number) {
  return Number(n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function verdictLabel(v: string) {
  const map: Record<string, string> = {
    BALANCED_OK: '平账',
    UNBALANCED_GAP: '长短款',
    ROLLBACK_REVERSED: '已冲正',
  }
  return map[v] || v
}

function verdictChip(v: string) {
  if (v === 'BALANCED_OK') return 'bg-emerald-50 text-emerald-700'
  if (v === 'UNBALANCED_GAP') return 'bg-rose-50 text-rose-700'
  return 'bg-amber-50 text-amber-700'
}

function renderThermo() {
  if (!thermoRef.value) return
  if (!thermoChart.value) thermoChart.value = echarts.init(thermoRef.value)
  const banks = records.value.map((r) => r.bank_name.replace(/中国|南京|支行/g, '').slice(0, 8))
  const gaps = records.value.map((r) => Number(r.difference_gap_amount))
  thermoChart.value.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 30, top: 30, bottom: 50 },
    xAxis: { type: 'category', data: banks, axisLabel: { rotate: 20, fontSize: 10 } },
    yAxis: { type: 'value', name: '差额(元)' },
    visualMap: {
      show: false,
      min: 0,
      max: Math.max(...gaps.map(Math.abs), 1),
      inRange: { color: ['#0d9488', '#f59e0b', '#e11d48'] },
    },
    series: [
      {
        type: 'bar',
        data: gaps,
        barMaxWidth: 40,
        itemStyle: {
          color: (params: { value: number }) =>
            params.value === 0 ? '#0d9488' : Math.abs(params.value) > 1000 ? '#e11d48' : '#f59e0b',
        },
        markLine: { data: [{ yAxis: 0, name: '平账基线' }], lineStyle: { color: '#64748b' } },
      },
    ],
  })
}

async function doReversal() {
  if (!selectedBatch.value) return
  reversing.value = true
  try {
    await executeReversal(selectedBatch.value, auth.displayName || '运维经办')
    reversalMsg.value = `批次 ${selectedBatch.value} 已完成自动冲正，差额归零。`
    selectedBatch.value = ''
    records.value = await getReconciliationRecords()
    await nextTick()
    renderThermo()
  } finally {
    reversing.value = false
  }
}

function generateReport() {
  const ok = records.value.filter((r) => r.reconciliation_verdict === 'BALANCED_OK').length
  const gap = records.value.filter((r) => r.reconciliation_verdict === 'UNBALANCED_GAP').length
  const rev = records.value.filter((r) => r.reconciliation_verdict === 'ROLLBACK_REVERSED').length
  dayReport.value = `【日结对账报告 ${new Date().toLocaleDateString('zh-CN')}】\n平账 ${ok} 批 · 长短款 ${gap} 批 · 已冲正 ${rev} 批\n报告已生成，可提交财务核算科签批。`
}

onMounted(async () => {
  records.value = await getReconciliationRecords()
  await nextTick()
  renderThermo()
  window.addEventListener('resize', () => thermoChart.value?.resize())
})

onUnmounted(() => {
  thermoChart.value?.dispose()
})
</script>
