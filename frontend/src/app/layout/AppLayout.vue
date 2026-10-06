<template>
  <div class="app-layout">
    <AppHeader />
    <main class="page">
      <slot />
      <AppFooter />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
</script>

<style scoped lang="scss" src="@/styles/layout/app-layout.scss"></style>
