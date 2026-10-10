<template>
  <Icon
    :icon="icon"
    class="base-icon"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : true"
    focusable="false"
  />
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{
  icon: string
  label?: string
}>()
</script>

<style scoped lang="scss" src="@/styles/ui/base-icon.scss"></style>
