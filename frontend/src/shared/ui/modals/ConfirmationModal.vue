<template>
  <BaseModal ref="modal" :title="title" :before-close="canClose" @close="emit('close')">
    <p class="confirmation-message">{{ message }}</p>
    <template #actions>
    <div class="modal__actions">
      <BaseButton variant="secondary" :disabled="loading" @click="modal?.requestClose()">{{
        cancelLabel
      }}</BaseButton>
      <BaseButton :loading="loading" :loading-label="loadingLabel" @click="emit('confirm')">{{ confirmLabel }}</BaseButton>
    </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import { ref } from 'vue'
const modal = ref<InstanceType<typeof BaseModal>>()
import BaseButton from '../buttons/BaseButton.vue'

const props = withDefaults(
  defineProps<{
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    loading?: boolean
    loadingLabel?: string
  }>(),
  {
    confirmLabel: 'Подтвердить',
    cancelLabel: 'Отмена',
    loading: false,
    loadingLabel: 'Подтверждаем…',
  },
)

function canClose() {
  return !props.loading
}

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<style scoped lang="scss" src="@/styles/ui/confirmation-modal.scss"></style>
