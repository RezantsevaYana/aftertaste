<template>
  <div :style="{ '--sticky-header-height': compactHeader ? '44px' : '0px' }" class="app-layout" :class="{ 'app-layout--auth': authScreen, 'app-layout--account': activePage === 'profile' && !authScreen }">
    <AppHeader @compact="compactHeader = $event" :active-page="activePage" :active-section="activeSection" @navigate="emit('navigate', $event)" @profile="emit('profile')" @catalog="emit('catalog', $event)" @logout="emit('logout')" />
    <main class="page">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const compactHeader = ref(false)
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
import type { EntryStatus } from '@/entities/entry'

withDefaults(defineProps<{
  authScreen?: boolean
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
