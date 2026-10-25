<template>
  <button
    :type="type"
    class="button"
    :class="[`button--${variant}`, { 'button--compact': size === 'compact', 'button--loading': loading }]"
    :disabled="disabled || loading"
    :aria-busy="loading"
  >
    <span class="button__content" :class="{ 'button__content--hidden': loading }"><slot /></span>
    <span v-if="loading" class="button__progress" role="status">
      <VinylLoader />
      <span>{{ loadingLabel }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import VinylLoader from '@/shared/ui/feedback/VinylLoader.vue'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary'
    size?: 'default' | 'compact'
    type?: 'button' | 'submit'
    disabled?: boolean
    loading?: boolean
    loadingLabel?: string
  }>(),
  {
    variant: 'primary',
    type: 'button',
    size: 'default',
    disabled: false,
    loading: false,
    loadingLabel: 'Загружаем…',
  },
)
</script>

<style scoped lang="scss" src="@/styles/ui/base-button.scss"></style>
