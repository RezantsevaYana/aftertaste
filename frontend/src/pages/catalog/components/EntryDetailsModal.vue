<template>
  <BaseModal
    :title="entry.title"
    :eyebrow="contentTypes.find((type) => type.value === entry.type)?.singular"
    @close="emit('close')"
    ><div class="detail-meta">
      <strong>{{ entry.rating }} / 10</strong
      ><span>{{ formatMonth(entry.month) }}</span>
    </div>
    <dl v-if="entry.type === 'album'" class="detail-fields">
      <div>
        <dt>Исполнитель</dt>
        <dd>{{ entry.artist }}</dd>
      </div>
    </dl>
    <dl
      v-if="entry.type === 'theatre' && (entry.theatreGenre || entry.venue)"
      class="detail-fields"
    >
      <div v-if="entry.theatreGenre">
        <dt>Жанр</dt>
        <dd>{{ theatreGenres.find((genre) => genre.value === entry.theatreGenre)?.label }}</dd>
      </div>
      <div v-if="entry.venue">
        <dt>Место просмотра</dt>
        <dd>{{ entry.venue }}</dd>
      </div>
    </dl>
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
      <BaseButton variant="secondary" @click="emit('requestDelete')"
        >Удалить запись</BaseButton
      >
      <BaseButton @click="emit('edit')">Редактировать</BaseButton>
    </div></BaseModal
  >
</template>

<script setup lang="ts">
import type { Entry } from '@/entities/entry'
import { contentTypes, theatreGenres } from '@/entities/entry'
import { formatMonth } from '@/shared/lib/date'
import { BaseModal } from '@/shared/ui'
import { BaseButton } from '@/shared/ui'
defineProps<{ entry: Entry }>()
const emit = defineEmits<{ close: []; edit: []; requestDelete: [] }>()
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-details-modal.scss"></style>
