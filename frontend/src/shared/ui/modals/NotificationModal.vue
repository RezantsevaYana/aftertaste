<template>
  <BaseToast :title="title" :message="message" :status="status" @close="emit('close')" />
</template>

<script setup lang="ts">
import BaseToast from '@/shared/ui/feedback/BaseToast.vue'

defineProps<{
  status: 'success' | 'error'
  title: string
  message: string
}>()
const emit = defineEmits<{
  close: []
}>()
</script>
