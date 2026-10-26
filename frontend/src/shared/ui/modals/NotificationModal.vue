<template>
  <BaseModal ref="modal" :title="title" @close="emit('close')"
    ><div class="notification" :role="status === 'error' ? 'alert' : 'status'">
      <span
        class="notification__icon"
        :class="{ 'notification__icon--error': status === 'error' }"
        >{{ status === 'success' ? '✓' : '!' }}</span
      >
      <p>{{ message }}</p>
    </div>
    <template #actions>
    <div class="modal__actions">
      <BaseButton @click="modal?.requestClose()">Понятно</BaseButton>
    </div>
    </template></BaseModal
  >
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import { ref } from 'vue'
const modal = ref<InstanceType<typeof BaseModal>>()
import BaseButton from '../buttons/BaseButton.vue'
defineProps<{
  status: 'success' | 'error'
  title: string
  message: string
}>()
const emit = defineEmits<{
  close: []
}>()
</script>

<style scoped lang="scss" src="@/styles/ui/notification-modal.scss"></style>
