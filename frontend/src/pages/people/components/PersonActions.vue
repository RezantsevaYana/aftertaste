<template>
  <div class="person-actions">
    <template v-if="person.friend">
      <span class="friend-status"><BaseIcon icon="lucide:check" />Вы друзья</span>
      <BaseButton v-if="allowRemove" size="compact" variant="secondary" :disabled="busy" :loading="loadingAction === 'remove'" @click="confirmRemove = true">Удалить из друзей</BaseButton>
    </template>
    <template v-else-if="person.request === 'incoming'">
      <BaseButton size="compact" :disabled="busy" :loading="loadingAction === 'accept'" @click="emit('action', 'accept')">Принять заявку</BaseButton>
      <BaseButton size="compact" variant="secondary" :disabled="busy" :loading="loadingAction === 'remove'" @click="emit('action', 'remove')">Отклонить</BaseButton>
    </template>
    <BaseButton v-else-if="person.request === 'outgoing'" size="compact" variant="secondary" :disabled="busy" :loading="loadingAction === 'remove'" @click="emit('action', 'remove')">Отменить заявку</BaseButton>
    <BaseButton v-else size="compact" variant="secondary" :disabled="busy" :loading="loadingAction === 'request'" @click="emit('action', 'request')">Добавить в друзья</BaseButton>
    <BaseButton size="compact" :variant="person.following ? 'secondary' : 'primary'" :disabled="busy" :aria-pressed="person.following" :loading="loadingAction === 'follow'" @click="emit('action', 'follow')">{{ person.following ? 'Отписаться' : 'Подписаться' }}</BaseButton>
    <ConfirmationModal v-if="confirmRemove" title="Удалить из друзей?" message="Подписки сохранятся, а доступ к рецензиям и планам для друзей закроется." confirm-label="Удалить из друзей" @close="confirmRemove = false" @confirm="confirmRemove = false; emit('action', 'remove')" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import type { SocialPerson } from '@/entities/person'
import { BaseButton, BaseIcon, ConfirmationModal } from '@/shared/ui'
defineProps<{
  person: SocialPerson
  busy: boolean
  loadingAction?: string
  allowRemove?: boolean
}>()
const emit = defineEmits<{
  action: [action: 'accept' | 'remove' | 'request' | 'follow']
}>()
const confirmRemove = ref(false)
</script>
<style scoped lang="scss" src="@/styles/social/person-actions.scss"></style>
