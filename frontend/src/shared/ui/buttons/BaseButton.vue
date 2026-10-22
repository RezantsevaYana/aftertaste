<template>
  <button :type="type" class="button" :class="[`button--${variant}`, { 'button--compact': size === 'compact' }]">
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary'
    size?: 'default' | 'compact'
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', type: 'button', size: 'default' },
)
</script>

<style scoped lang="scss" src="@/styles/ui/base-button.scss"></style>
