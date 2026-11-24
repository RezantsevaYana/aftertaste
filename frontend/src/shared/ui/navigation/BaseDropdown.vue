<template>
  <div ref="root" class="dropdown" @keydown.esc.stop.prevent="close()" @focusout="onFocusOut">
    <button ref="trigger" type="button" class="dropdown-trigger" :aria-label="label" :aria-expanded="open" :aria-controls="panelId" :disabled="disabled" @click="open = !open">
      <slot name="trigger" />
    </button>
    <div v-if="open" :id="panelId" class="dropdown-panel" :class="{ 'dropdown-panel--start': align === 'start' }">
      <slot :close="close" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId } from 'vue'

withDefaults(defineProps<{
  label: string
  disabled?: boolean
  align?: 'start' | 'end'
}>(), { align: 'end' })
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const open = ref(false)
const panelId = useId()

function close(restoreFocus = true) {
  open.value = false
  if (restoreFocus) trigger.value?.focus()
}
function onPointerDown(event: PointerEvent) {
  if (event.target instanceof Node && !root.value?.contains(event.target)) close(false)
}
function onFocusOut(event: FocusEvent) {
  if (!(event.relatedTarget instanceof Node) || !root.value?.contains(event.relatedTarget)) close(false)
}
onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onUnmounted(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<style scoped lang="scss" src="@/styles/ui/base-dropdown.scss"></style>
