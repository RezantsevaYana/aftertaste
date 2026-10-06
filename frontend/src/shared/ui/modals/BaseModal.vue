<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      class="modal"
      :aria-labelledby="titleId"
      @cancel.prevent="emit('close')"
      @click="closeOnBackdrop"
    >
      <header class="modal__header">
        <div>
          <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
          <h2 :id="titleId">{{ title }}</h2>
        </div>
        <BaseButton
          variant="secondary"
          aria-label="Закрыть окно"
          @click="emit('close')"
        >
          ×
        </BaseButton>
      </header>
      <slot /></dialog
  ></Teleport>
</template>

<script setup lang="ts">
import BaseButton from '../buttons/BaseButton.vue'
import { onMounted, onBeforeUnmount, ref, useId } from 'vue'
defineProps<{ title: string; eyebrow?: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const titleId = useId()
let previousFocus: HTMLElement | null = null
let previousOverflow = ''
onMounted(() => {
  previousFocus = document.activeElement as HTMLElement | null
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
})
onBeforeUnmount(() => {
  dialog.value?.close()
  document.body.style.overflow = previousOverflow
  previousFocus?.focus()
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
    emit('close')
}
</script>

<style scoped lang="scss" src="@/styles/ui/base-modal.scss"></style>
