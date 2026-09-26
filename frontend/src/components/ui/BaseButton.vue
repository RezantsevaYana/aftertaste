<template>
  <button :type="type" class="button" :class="`button--${variant}`">
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', type: 'button' },
)
</script>

<style scoped lang="scss" src="@/styles/ui/BaseButton.scss"></style>
