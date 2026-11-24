<template>
  <div class="app-layout">
    <AppHeader :active-page="activePage" :active-section="activeSection" @navigate="emit('navigate', $event)" @profile="emit('profile')" @catalog="emit('catalog', $event)" @logout="emit('logout')" />
    <main class="page">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
import type { EntryStatus } from '@/entities/entry'

withDefaults(defineProps<{
  activePage?: 'catalog' | 'people' | 'recommendations' | 'profile'
  activeSection?: EntryStatus
}>(), { activeSection: 'done' })

const emit = defineEmits<{
  navigate: [page: 'people' | 'recommendations']
  profile: []
  catalog: [section?: EntryStatus]
  logout: []
}>()
</script>

<style scoped lang="scss" src="@/styles/layout/app-layout.scss"></style>
