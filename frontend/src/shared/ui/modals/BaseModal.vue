<template>
  <Teleport to="body">
    <Transition name="modal-motion" appear @after-leave="finishClose">
    <dialog
      v-if="visible"
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
      <footer v-if="$slots.actions" class="modal__footer"><slot name="actions" /></footer></dialog>
    </Transition>
  </Teleport>
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
const visible = ref(true)
let afterClose: (() => void) | undefined
let previousFocus: HTMLElement | null = null
function finish(callback?: () => void) {
  if (!visible.value) return
  afterClose = callback
  visible.value = false
}
defineExpose({ requestClose: () => requestClose(), finish })
const { dragging, closing, style, requestClose, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
  useBottomSheet(dialog, () => finish(), () => props.beforeClose?.() ?? true)
useModalScrollLock()
onMounted(() => {
  previousFocus = document.activeElement as HTMLElement | null
  dialog.value?.showModal()
  // Capture the visible initial state before Vue removes the enter classes.
  if (dialog.value) getComputedStyle(dialog.value).opacity
  dialog.value?.addEventListener('aftertaste:close-modal', onCloseFromAction)
})
function onCloseFromAction(event: Event) {
  finish((event as CustomEvent<() => void>).detail)
}
onBeforeUnmount(() => dialog.value?.removeEventListener('aftertaste:close-modal', onCloseFromAction))
function finishClose(element: Element) {
  (element as HTMLDialogElement).close()
  afterClose?.()
  emit('close')
  const openDialogs = document.querySelectorAll('dialog[open]')
  const topDialog = openDialogs.item(openDialogs.length - 1)
  if (previousFocus?.isConnected && (!topDialog || topDialog.contains(previousFocus))) {
    previousFocus.focus({ preventScroll: true })
  }
}
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
