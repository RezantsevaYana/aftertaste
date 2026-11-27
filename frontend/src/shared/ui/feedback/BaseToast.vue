<template>
  <Teleport to="body">
    <Transition name="toast-motion" @after-leave="emit('close')">
      <div
        v-if="visible"
        ref="toast"
        popover="manual"
        class="toast"
        @pointerenter="hovered = true"
        @pointerleave="hovered = false"
        @focusin="focused = true"
        @focusout="onFocusOut"
        @keydown.esc.stop="dismiss"
      >
        <div class="toast__message" :role="status === 'error' ? 'alert' : 'status'" aria-atomic="true">
          <strong v-if="title">{{ title }}</strong>
          <p>{{ message }}</p>
        </div>
        <div v-if="$slots.actions" class="toast__actions"><slot name="actions" /></div>
        <IconButton class="toast__close" icon="lucide:x" label="Закрыть уведомление" @click="dismiss" />
        <span class="toast__progress" aria-hidden="true" :style="{ transform: `scaleX(${progress})` }" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'
import IconButton from '@/shared/ui/buttons/IconButton.vue'

const props = defineProps<{
  message: string
  title?: string
  status?: 'success' | 'error'
}>()
const emit = defineEmits<{
  close: []
}>()
const slots = useSlots()
const toast = ref<HTMLElement>()
const visible = ref(false)
const hovered = ref(false)
const focused = ref(false)
const progress = ref(1)
const duration = slots.actions || props.status === 'error' ? 12000 : 7000
let elapsed = 0
let previousTime = 0
let frame = 0
let generation = 0
function dismiss() {
  generation++
  visible.value = false
  cancelAnimationFrame(frame)
}
function onFocusOut(event: FocusEvent) {
  focused.value = (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)
}
function tick(time: number) {
  if (!hovered.value && !focused.value && !document.hidden) elapsed += Math.min(time - previousTime, 100)
  previousTime = time
  progress.value = Math.max(0, 1 - elapsed / duration)
  if (elapsed >= duration) dismiss()
  else frame = requestAnimationFrame(tick)
}
async function start() {
  const current = ++generation
  cancelAnimationFrame(frame)
  elapsed = 0
  previousTime = performance.now()
  progress.value = 1
  visible.value = true
  await nextTick()
  if (current !== generation || !toast.value) return
  toast.value.showPopover?.()
  if (toast.value) getComputedStyle(toast.value).opacity
  frame = requestAnimationFrame(tick)
}
onMounted(start)
watch(() => props.message, start)
onBeforeUnmount(() => { generation++; cancelAnimationFrame(frame) })
</script>

<style scoped lang="scss" src="@/styles/ui/base-toast.scss"></style>
