<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      :id="dialogId"
      class="modal"
      :class="{ 'modal--dragging': dragging, 'modal--closing': closing }"
      :style="style"
      :aria-labelledby="titleId"
      @cancel.prevent="requestClose"
      @click="closeOnBackdrop"
    >
      <div
        class="modal__drag-area"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @lostpointercapture="onPointerCancel"
      >
      <div class="modal__handle" aria-hidden="true"><span /></div>
      </div>
      <div class="modal__content">
      <header class="modal__header">
        <div>
          <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
          <h2 :id="titleId">{{ title }}</h2>
        </div>
        <IconButton
          class="modal__close"
          icon="lucide:x"
          label="Закрыть окно"
          @click="requestClose"
        />
      </header>
      <slot />
      </div>
      <footer v-if="$slots.actions" class="modal__footer"><slot name="actions" /></footer></dialog
  ></Teleport>
</template>

<script setup lang="ts">
import IconButton from '@/shared/ui/buttons/IconButton.vue'
import { useBottomSheet } from '@/shared/composables/useBottomSheet'
import { useModalScrollLock } from '@/shared/composables/useModalScrollLock'
import { onMounted, onBeforeUnmount, ref, useId } from 'vue'
const props = defineProps<{
  title: string
  eyebrow?: string
  beforeClose?: () => boolean
}>()
const emit = defineEmits<{
  close: []
}>()
const dialog = ref<HTMLDialogElement>()
const titleId = useId()
const dialogId = `modal-${useId()}`
let previousFocus: HTMLElement | null = null
const { dragging, closing, style, requestClose, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
  useBottomSheet(dialog, () => emit('close'), () => props.beforeClose?.() ?? true)
useModalScrollLock()
onMounted(() => {
  previousFocus = document.activeElement as HTMLElement | null
  dialog.value?.showModal()
})
onBeforeUnmount(() => {
  dialog.value?.close()
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
})
function closeOnBackdrop(event: MouseEvent) {
  if (event.target !== dialog.value) return
  const rect = dialog.value.getBoundingClientRect()
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    requestClose()
}
</script>

<style scoped lang="scss" src="@/styles/ui/base-modal.scss"></style>
