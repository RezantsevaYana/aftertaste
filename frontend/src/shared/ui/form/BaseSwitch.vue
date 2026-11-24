<template>
  <button type="button" class="base-switch" role="switch" :aria-checked="model" :aria-label="label" :disabled="disabled" @click="model = !model">
    <span class="base-switch-track" aria-hidden="true"><span /></span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  disabled?: boolean
}>()
const model = defineModel<boolean>({ required: true })
</script>

<style scoped lang="scss" src="@/styles/ui/base-switch.scss"></style>
