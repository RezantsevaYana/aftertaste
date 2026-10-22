<template>
  <button type="button" class="icon-button" :aria-label="label" :title="label">
    <BaseIcon :icon="icon" />
  </button>
</template>

<script setup lang="ts">
import BaseIcon from '@/shared/ui/icons/BaseIcon.vue'

defineProps<{
  icon: string
  label: string
}>()
</script>

<style scoped lang="scss" src="@/styles/ui/icon-button.scss"></style>
