<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h4 class="font-semibold text-slate-800">个贷全周期资产质量监控</h4>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in tierOptions"
          :key="opt.value"
          type="button"
          class="rounded-lg px-3 py-1 text-xs font-semibold"
          :class="tier === opt.value ? 'bg-indigo-700 text-white' : 'border border-slate-200 bg-white text-slate-600'"
          @click="tier = opt.value"
        >
          {{ opt.label }}
        </button>
        <button class="btn-primary text-xs" type="button" @click="emitCollectionNotice">一键生成催收督办单</button>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-3">
      <div class="panel-card p-4 xl:col-span-2">
        <p class="mb-2 text-sm font-medium text-slate-700">M1 / M2 / M3 逾期账龄分布</p>
        <div ref="agingRef" class="h-56 w-full" />
      </div>
      <div class="panel-card p-4">
        <p class="mb-2 text-sm font-medium text-slate-700">抵押房产权属时间轴</p>
        <ol class="relative space-y-4 border-l border-slate-200 pl-4 text-xs text-slate-600">
          <li v-for="evt in timeline" :key="evt.title">
            <span class="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-teal-500" />
            <p class="font-semibold text-slate-800">{{ evt.title }}</p>
            <p class="text-slate-500">{{ evt.desc }}</p>
          </li>
        </ol>
      </div>
    </div>

    <p v-if="notice" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{{ notice }}</p>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[860px] text-left text-sm">
        <thead class="text-xs text-slate-500">
          <tr>
            <th class="py-2">合同号</th>
            <th>借款人</th>
            <th>单位</th>
            <th>本金</th>
            <th>期限</th>
            <th>利率</th>
            <th>逾期天数</th>
            <th>逾期本息</th>
            <th>抵押标的</th>
            <th>风险档</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="loan in filtered" :key="loan.id" class="border-t border-slate-100">
            <td class="py-2 font-mono text-xs">{{ loan.loan_contract_no }}</td>
            <td>{{ loan.borrower_name_masked }}</td>
            <td class="max-w-[140px] truncate">{{ loan.unit_affinity_name }}</td>
            <td>¥{{ formatMoney(loan.principal_amount_yuan) }}</td>
            <td>{{ loan.loan_term_months }} 月</td>
            <td>{{ loan.annual_interest_rate }}%</td>
            <td :class="loan.current_overdue_days > 0 ? 'font-semibold text-rose-600' : 'text-emerald-600'">
              {{ loan.current_overdue_days }}
            </td>
            <td>¥{{ formatMoney(loan.overdue_principal_interest) }}</td>
            <td class="text-xs">{{ loan.collateral_property_geo }}</td>
            <td><span class="metric-chip" :class="tierChip(loan.loan_risk_tier)">{{ tierLabel(loan.loan_risk_tier) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import { getMortgageLoans, type MortgageLoan } from '@/utils/sqljs-engine'

const loans = ref<MortgageLoan[]>([])
const tier = ref('')
const notice = ref('')
const agingRef = ref<HTMLDivElement | null>(null)
const agingChart = shallowRef<echarts.ECharts | null>(null)

const tierOptions = [
  { value: '', label: '全部档位' },
  { value: 'TIER_NORMAL', label: '正常' },
  { value: 'TIER_SPECIAL_ATTENTION', label: '关注' },
  { value: 'TIER_SUBPRIME_LOSS', label: '次级/损失' },
]

const filtered = computed(() =>
  tier.value ? loans.value.filter((l) => l.loan_risk_tier === tier.value) : loans.value,
)

const timeline = [
  { title: '2024-06 抵押登记', desc: '不动产登记中心完成他项权证备案' },
  { title: '2025-03 权属核验', desc: '长三角不动产联网核验通过，无查封' },
  { title: '2026-08 逾期催收', desc: '触发 M2 账龄，生成公积金抵扣逾期方案' },
]

function formatMoney(n: number) {
  return Number(n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function tierLabel(t: string) {
  const map: Record<string, string> = {
    TIER_NORMAL: '正常',
    TIER_SPECIAL_ATTENTION: '关注',
    TIER_SUBPRIME_LOSS: '次级/损失',
  }
  return map[t] || t
}

function tierChip(t: string) {
  if (t === 'TIER_NORMAL') return 'bg-emerald-50 text-emerald-700'
  if (t === 'TIER_SPECIAL_ATTENTION') return 'bg-amber-50 text-amber-700'
  return 'bg-rose-50 text-rose-700'
}

function agingBucket(days: number) {
  if (days <= 0) return '正常'
  if (days <= 30) return 'M1'
  if (days <= 60) return 'M2'
  return 'M3+'
}

function renderAging() {
  if (!agingRef.value) return
  if (!agingChart.value) agingChart.value = echarts.init(agingRef.value)
  const buckets = ['正常', 'M1', 'M2', 'M3+']
  const counts = buckets.map((b) => filtered.value.filter((l) => agingBucket(Number(l.current_overdue_days)) === b).length)
  agingChart.value.setOption({
    color: ['#0d9488', '#0369a1', '#f59e0b', '#e11d48'],
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        data: buckets.map((name, i) => ({ name, value: counts[i] })),
        label: { formatter: '{b}: {c}' },
      },
    ],
  })
}

function emitCollectionNotice() {
  const overdue = filtered.value.filter((l) => Number(l.current_overdue_days) > 0)
  notice.value = `已生成法务催收督办单 COLLECT-JS-${Date.now().toString().slice(-6)}，覆盖逾期合同 ${overdue.length} 笔，建议启用公积金账户抵扣逾期本息方案。`
}

watch(filtered, async () => {
  await nextTick()
  renderAging()
})

onMounted(async () => {
  loans.value = await getMortgageLoans()
  await nextTick()
  renderAging()
  window.addEventListener('resize', () => agingChart.value?.resize())
})

onUnmounted(() => {
  agingChart.value?.dispose()
})
</script>
