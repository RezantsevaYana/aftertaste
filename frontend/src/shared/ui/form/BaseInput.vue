<template>
  <div class="field field--floating" :class="{ 'field--validated': error !== undefined, 'field--invalid': error, 'field--filled': hasValue }">
    <div class="field__control">
      <input
        :id="id"
        ref="input"
        v-model="model"
        v-bind="$attrs"
        :aria-invalid="!!error"
        :aria-describedby="describedBy"
      />
      <IconButton
        v-if="showClear"
        class="input-clear"
        icon="lucide:x"
        :label="clearLabel"
        @click="clear"
      />
      <label class="field__label" :for="id">{{ label }}</label>
      <small v-if="error" :id="`${id}-error`" class="field__error" role="alert">{{ error }}</small>
    </div>
    <small v-if="hint && !error" :id="`${id}-hint`">{{ hint }}</small>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import IconButton from '@/shared/ui/buttons/IconButton.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{
  error?: string
  label: string
  id: string
  hint?: string
}>()
const model = defineModel<string | number>()
const attrs = useAttrs()
const input = ref<HTMLInputElement>()
const showClear = computed(() => attrs.type === 'search' && hasValue.value && !attrs.disabled && !attrs.readonly)
const clearLabel = computed(() => `Очистить ${props.label.toLowerCase()}`)
function clear() {
  model.value = ''
  input.value?.focus()
}
const hasValue = computed(() => model.value !== undefined && model.value !== null && model.value !== '')
const describedBy = computed(() => [props.error ? `${props.id}-error` : '', props.hint && !props.error ? `${props.id}-hint` : ''].filter(Boolean).join(' ') || undefined)
</script>

<style scoped lang="scss" src="@/styles/ui/base-input.scss"></style>
