<template>
  <header class="global-sticky-top-banner" role="banner">
    <div class="banner-inner">
      <span class="banner-badge">江苏省级机关资金中心</span>
      <span class="banner-text">
        获取网站源码，请访问：
        <a
          href="https://github.com/softwarelink-net/26-js-fnd-bid"
          target="_blank"
          rel="noopener noreferrer"
          class="banner-link"
        >
          https://github.com/softwarelink-net/26-js-fnd-bid
        </a>
      </span>
    </div>
  </header>
</template>

<script setup lang="ts">
</script>

<style scoped>
.global-sticky-top-banner {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 40px !important;
  z-index: 9999 !important;
  background: linear-gradient(90deg, #1e1b4b 0%, #0369a1 50%, #0d9488 100%);
  color: #f8fafc;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}
.banner-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0 12px;
}
.banner-badge {
  background: #38bdf8;
  color: #082f49;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
}
.banner-link {
  color: #bae6fd;
  text-decoration: underline;
  margin-left: 4px;
  transition: color 0.2s ease;
}
.banner-link:hover {
  color: #ffffff;
}
</style>
