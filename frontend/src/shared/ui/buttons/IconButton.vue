<template>
  <button type="button" class="icon-button" :class="{ [`icon-button--${size}`]: size }" :aria-label="label" :title="label">
    <BaseIcon :icon="icon" />
  </button>
</template>

<script setup lang="ts">
import BaseIcon from '@/shared/ui/icons/BaseIcon.vue'

defineProps<{
  icon: string
  label: string
  size?: 'compact' | 'dense'
}>()
</script>

<style scoped lang="scss" src="@/styles/ui/icon-button.scss"></style>
