<template>
  <GlobalStickyBanner />
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import GlobalStickyBanner from '@/components/common/GlobalStickyBanner.vue'
</script>
