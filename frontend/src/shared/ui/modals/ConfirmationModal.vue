<template>
  <BaseModal :title="title" @close="emit('close')">
    <p class="confirmation-message">{{ message }}</p>
    <template #actions>
    <div class="modal__actions">
      <BaseButton variant="secondary" @click="emit('close')">{{
        cancelLabel
      }}</BaseButton>
      <BaseButton @click="emit('confirm')">{{ confirmLabel }}</BaseButton>
    </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import BaseButton from '../buttons/BaseButton.vue'

withDefaults(
  defineProps<{
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
  }>(),
  {
    confirmLabel: 'Подтвердить',
    cancelLabel: 'Отмена',
  },
)

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<style scoped lang="scss" src="@/styles/ui/confirmation-modal.scss"></style>
