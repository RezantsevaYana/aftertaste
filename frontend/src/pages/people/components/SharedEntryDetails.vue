<template>
  <BaseModal ref="modal" :title="entry.title" :before-close="() => !busy" @close="emit('close')">
    <p class="public-entry-meta">{{ categoryLabel }}<span v-if="entry.rating"> · {{ entry.rating }} / 10</span></p>
    <p v-if="creator" class="public-entry-meta">{{ creator }}</p>
    <p v-if="entry.reviewHidden" class="public-review-note">Рецензия скрыта владельцем.</p>
    <p v-else class="public-review">{{ entry.review || 'Пока без рецензии.' }}</p>
    <p v-if="error" role="alert" class="social-error">{{ error }}</p>
    <template #actions><div class="modal__actions"><BaseButton variant="secondary" :disabled="busy" @click="modal?.requestClose()">Закрыть</BaseButton><BaseButton :loading="busy" @click="emit('copy')">Добавить в планы</BaseButton></div></template>
  </BaseModal>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RemoteEntry } from '@/api/social'
import { getEntryCategoryLabel } from '@/entities/entry'
import { BaseButton, BaseModal } from '@/shared/ui'
const props = defineProps<{
  entry: RemoteEntry
  busy: boolean
  error: string
}>()
const emit = defineEmits<{
  close: []
  copy: []
}>()
const modal = ref<InstanceType<typeof BaseModal>>()
const categoryLabel = computed(() => getEntryCategoryLabel(props.entry))
const creator = computed(() => props.entry.author || props.entry.artist || props.entry.director)
</script>
<style scoped lang="scss" src="@/styles/social/shared-entry-details.scss"></style>
