<template>
  <Icon
    :icon="resolvedIcon"
    class="base-icon"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : true"
    focusable="false"
  />
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { getAccountIcon } from '@/shared/ui/icons/account-icons'

const props = defineProps<{
  icon: string
  label?: string
}>()
const resolvedIcon = computed(() => getAccountIcon(props.icon) ?? props.icon)
</script>

<style scoped lang="scss" src="@/styles/ui/base-icon.scss"></style>
