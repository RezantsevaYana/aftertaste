<template>
  <BaseModal :title="title" @close="emit('close')"
    ><div class="notification" :role="status === 'error' ? 'alert' : 'status'">
      <span
        class="notification__icon"
        :class="{ 'notification__icon--error': status === 'error' }"
        >{{ status === 'success' ? '✓' : '!' }}</span
      >
      <p>{{ message }}</p>
    </div>
    <div class="modal__actions">
      <BaseButton @click="emit('close')">Понятно</BaseButton>
    </div></BaseModal
  >
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import BaseButton from '../buttons/BaseButton.vue'
defineProps<{ status: 'success' | 'error'; title: string; message: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<style scoped lang="scss" src="@/styles/ui/notification-modal.scss"></style>
