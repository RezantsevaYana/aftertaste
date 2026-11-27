<template>
  <div class="field field--floating" :class="{ 'field--validated': error !== undefined, 'field--invalid': error, 'field--filled': hasValue }">
    <div class="field__control">
      <div class="textarea-shell">
      <textarea
        :id="id"
        v-model="model"
        v-bind="$attrs"
        :aria-invalid="!!error"
        :aria-describedby="describedBy"
        rows="4"
      />
      </div>
      <label class="field__label" :for="id">{{ label }}</label>
      <small v-if="error" :id="`${id}-error`" class="field__error" role="alert">{{ error }}</small>
    </div>
    <span v-if="error !== undefined" class="field__error-space" aria-hidden="true">{{ error || ' ' }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{
  error?: string
  label: string
  id: string
}>()
const model = defineModel<string>()
const hasValue = computed(() => model.value !== undefined && model.value !== null && model.value !== '')
const describedBy = computed(() => props.error ? `${props.id}-error` : undefined)
</script>

<style scoped lang="scss" src="@/styles/ui/base-textarea.scss"></style>
