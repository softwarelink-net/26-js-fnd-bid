<template>
  <div class="auth-shell min-h-[calc(100vh-40px)] relative overflow-hidden">
    <div class="auth-bg" aria-hidden="true" />
    <div class="relative z-10 mx-auto flex min-h-[calc(100vh-40px)] max-w-6xl flex-col px-4 py-8 md:px-8">
      <div class="mb-8 flex items-center justify-between gap-4 text-cyan-50">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-cyan-200/80">JSZC-320000-NJJD-C2026-0016 · 江苏住房资金</p>
          <h1 class="mt-1 text-xl font-bold md:text-2xl">省级机关住房资金中心信息系统</h1>
        </div>
        <nav class="flex gap-3 text-sm">
          <RouterLink class="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20" to="/tender">招标公告</RouterLink>
          <RouterLink class="rounded-lg bg-teal-500/90 px-3 py-1.5 font-semibold text-white hover:bg-teal-400" to="/login">登录系统</RouterLink>
        </nav>
      </div>
      <slot />
      <RouterView v-if="!$slots.default" />
      <p class="mt-auto pt-10 text-center text-xs text-cyan-100/60">
        江苏省省级机关住房资金管理中心 · 演示系统仅供研究参考
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<style scoped>
.auth-shell {
  background: radial-gradient(ellipse at top left, rgba(30, 27, 75, 0.55), transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(13, 148, 136, 0.3), transparent 45%),
    linear-gradient(160deg, #1e1b4b 0%, #082f49 40%, #0f766e 100%);
}
.auth-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
  pointer-events: none;
}
</style>
