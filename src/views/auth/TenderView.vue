<template>
  <AuthLayout>
    <article class="panel-card mx-auto w-full max-w-4xl overflow-hidden">
      <header class="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-teal-50 px-6 py-5 md:px-8">
        <p class="text-xs font-semibold tracking-wider text-teal-700">公开招标公告全文</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">资金中心信息系统外包服务采购竞争性磋商公告</h2>
        <p class="mt-2 text-sm text-slate-600">项目编号 JSZC-320000-NJJD-C2026-0016 · 发布于 2026-09-15 15:00:00</p>
      </header>

      <div class="space-y-6 px-6 py-6 md:px-8">
        <section v-for="block in blocks" :key="block.title">
          <h3 class="mb-2 flex items-center gap-2 text-base font-bold text-slate-800">
            <span class="inline-flex h-6 w-6 items-center justify-center rounded bg-sky-700 text-xs text-white">{{ block.no }}</span>
            {{ block.title }}
          </h3>
          <div class="rounded-lg border border-slate-100 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap">{{ block.body }}</div>
        </section>

        <section>
          <h3 class="mb-2 text-base font-bold text-slate-800">技术要点</h3>
          <ul class="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li v-for="item in techPoints" :key="item"><span v-html="item" /></li>
          </ul>
        </section>

        <section>
          <h3 class="mb-2 text-base font-bold text-slate-800">技术创新性</h3>
          <ul class="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li v-for="item in innovations" :key="item"><span v-html="item" /></li>
          </ul>
        </section>

        <section class="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
          <h3 class="font-bold text-teal-900">江苏省政府采购（苏采云）平台电子招投标指引</h3>
          <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-teal-900/90">
            <li>登录江苏省政府采购网（苏采云）完成供应商注册与 CA 数字证书绑定。</li>
            <li>检索项目编号 <strong>JSZC-320000-NJJD-C2026-0016</strong>，下载竞争性磋商文件并完成费用缴纳（如有）。</li>
            <li>按磋商文件编制响应文件，于 <strong>2026年09月29日14:30</strong> 前通过电子投标系统递交。</li>
            <li>本项目不接受联合体投标，采购内容为资金中心信息系统外包服务 1 年。</li>
          </ol>
        </section>
      </div>
    </article>
  </AuthLayout>
</template>

<script setup lang="ts">
import AuthLayout from '@/layouts/AuthLayout.vue'

const blocks = [
  { no: '1', title: '标题', body: '资金中心信息系统外包服务采购竞争性磋商公告' },
  { no: '2', title: '项目发包方', body: '江苏省省级机关住房资金管理中心' },
  { no: '3', title: '项目编号', body: 'JSZC-320000-NJJD-C2026-0016' },
  { no: '4', title: '项目发布时间', body: '2026-09-15 15:00:00' },
  {
    no: '5',
    title: '关键词',
    body: '江苏省省级机关住房资金管理中心, 资金中心信息系统, 外包服务采购, 银企直联对账, 公积金风控, JSZC-320000-NJJD-C2026-0016, 江苏政府采购',
  },
  {
    no: '6',
    title: '摘要',
    body: '江苏省省级机关住房资金管理中心委托南京金鼎工程造价评估有限责任公司，对资金中心信息系统外包服务采购项目组织竞争性磋商，预算金额与最高限价为1,216,000.00元。采购内容为资金中心信息系统外包服务1年，不接受联合体投标，投标文件提交截止时间为2026年09月29日14:30。',
  },
]

const techPoints = [
  '<strong>省级机关公积金与住房补贴资金账户精准管理</strong>：覆盖全省数千家行政事业单位资金归集。',
  '<strong>多承办银行银企直联专线高并发清算与日终自动对账平账</strong>：保障资金流转零长短款差错。',
  '<strong>公积金非理性提取与虚构材料智能反欺诈识别</strong>：联动跨域大数据模型实施秒级阻断。',
  '<strong>纯前端 WebAssembly sql.js 边缘极速响应体系</strong>：零服务器常驻运维开销，数据本地极简持久化。',
]

const innovations = [
  '<strong>全要素省级机关住房公积金运营与资产流动性安全全景大屏</strong>：宏观洞察备付金保证率、个贷逾期率与外包运维保障指标。',
  '<strong>统一业务命名空间严格隔离架构</strong>：统一采用专用数据表前缀与独立本地存储载体，杜绝多系统交叉干扰。',
]
</script>
