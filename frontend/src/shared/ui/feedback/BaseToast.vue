<template>
  <div class="toast">
    <p role="status">{{ message }}</p>
    <IconButton icon="lucide:x" label="Закрыть уведомление" @click="emit('close')" />
  </div>
</template>

<script setup lang="ts">
import IconButton from '@/shared/ui/buttons/IconButton.vue'

defineProps<{
  message: string
}>()
const emit = defineEmits<{
  close: []
}>()
</script>

<style scoped lang="scss" src="@/styles/ui/base-toast.scss"></style>
