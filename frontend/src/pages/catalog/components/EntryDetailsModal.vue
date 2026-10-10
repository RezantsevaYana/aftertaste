<template>
  <BaseModal
    :title="entry.title"
    :eyebrow="entryTypeLabel"
    @close="emit('close')"
    ><div class="detail-meta">
      <strong>{{ entry.rating }} / {{ RATING_MAX }}</strong
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
        <dd>{{ theatreGenreLabel }}</dd>
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
import { computed } from 'vue'
import type { Entry } from '@/entities/entry'
import { contentTypes, theatreGenres, RATING_MAX } from '@/entities/entry'
import { formatMonth } from '@/shared/lib/date'
import { BaseModal } from '@/shared/ui'
import { BaseButton } from '@/shared/ui'
const props = defineProps<{ entry: Entry }>()
const emit = defineEmits<{ close: []; edit: []; requestDelete: [] }>()

const entryTypeLabel = computed(() =>
  contentTypes.find((type) => type.value === props.entry.type)?.singular,
)
const theatreGenreLabel = computed(() =>
  theatreGenres.find((genre) => genre.value === props.entry.theatreGenre)?.label,
)
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-details-modal.scss"></style>
