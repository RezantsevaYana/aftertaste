<template>
  <BaseModal
    :title="entry.title"
    :eyebrow="contentTypes.find((type) => type.value === entry.type)?.singular"
    @close="emit('close')"
    ><div class="detail-meta">
      <strong>{{ entry.rating }} / 10</strong
      ><span>{{ formatMonth(entry.month) }}</span>
    </div>
    <img
      v-if="entry.photo"
      class="detail-photo"
      :src="entry.photo"
      :alt="entry.title"
    />
    <p class="detail-review">
      {{
        entry.review ||
        'Пока без рецензии. Её можно добавить через «Редактировать».'
      }}
    </p>
    <div class="modal__actions">
      <BaseButton @click="emit('edit')">Редактировать</BaseButton>
    </div></BaseModal
  >
</template>

<script setup lang="ts">
import type { Entry } from '@/types/entry'
import { contentTypes, formatMonth } from '@/types/entry'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
defineProps<{ entry: Entry }>()
const emit = defineEmits<{ close: []; edit: [] }>()
</script>

<style scoped lang="scss" src="@/styles/catalog/EntryDetailsModal.scss"></style>
