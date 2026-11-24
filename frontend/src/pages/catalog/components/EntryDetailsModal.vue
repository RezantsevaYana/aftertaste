<template>
  <BaseModal
    ref="modal"
    :before-close="() => !savingVisibility"
    :title="entry.title"
    @close="emit('close')"
    ><div class="detail-meta">
      <strong v-if="!isPlan">{{ entry.rating }} / {{ RATING_MAX }}</strong
      ><span>{{ entryTypeLabel }}</span><span>{{ entryDate }}</span>
    </div>
    <dl v-if="entry.author || entry.director || entry.genre" class="detail-fields">
      <div v-if="entry.type === 'book' && entry.author"><dt>Автор</dt><dd>{{ entry.author }}</dd></div>
      <div v-if="entry.director"><dt>Режиссёр</dt><dd>{{ entry.director }}</dd></div>
      <div v-if="entry.genre"><dt>Жанр</dt><dd>{{ entry.genre }}</dd></div>
    </dl>
    <dl v-if="isMusicType(entry.type) && entry.artist" class="detail-fields">
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
    <PhotoGallery v-if="photos.length" :photos="photos" :label="entry.title" />
    <p class="detail-review">
      {{
        entry.review ||
        (isPlan ? 'Заметку для себя можно добавить через «Редактировать».' : 'Пока без рецензии. Её можно добавить через «Редактировать».')
      }}
    </p>
    <div v-if="!isPlan" class="detail-visibility">
      <BaseSelect id="detail-review-visibility" :model-value="entry.reviewVisibility ?? 'inherit'" label="Кто видит рецензию" :options="visibilityOptions" :disabled="savingVisibility" @update:model-value="changeVisibility" />
      <p>Название и оценка доступны другим пользователям. Рецензия видна по выбранному правилу.</p>
    </div>
    <dl v-if="entry.source" class="detail-fields"><div><dt>Источник</dt><dd>{{ entry.source.name }}</dd></div></dl>
    <div class="detail-social"><h3>С кем</h3><p>{{ companionNames || 'Пока никого не отметила' }}</p><small>Личная пометка. Видна только тебе.</small><BaseButton size="compact" variant="secondary" @click="companionsOpen = true">Изменить</BaseButton></div>
    <BaseButton v-if="!isPlan" size="compact" variant="secondary" @click="recommendOpen = true">Порекомендовать</BaseButton>
    <template #actions>
    <div class="modal__actions">
      <BaseButton variant="secondary" @click="modal?.finish(() => emit('requestDelete'))"
        >Удалить запись</BaseButton
      >
      <BaseButton :variant="isPlan ? 'secondary' : 'primary'" @click="modal?.finish(() => emit('edit'))">Редактировать</BaseButton>
      <BaseButton v-if="isPlan" @click="modal?.finish(() => emit('complete', entry))">{{ completionLabel }}</BaseButton>
    </div>
    </template></BaseModal
  >
  <RecommendEntryModal v-if="recommendOpen" ref="recommendModal" :entry="entry" @close="recommendOpen = false" @sent="sent = true" />
  <EntryCompanionsModal v-if="companionsOpen" ref="companionsModal" :entry="entry" @close="companionsOpen = false" @saved="companionsSaved" />
  <BaseToast v-if="sent" message="Рекомендация отправлена" @close="sent = false" />
</template>

<script setup lang="ts">
import RecommendEntryModal from '@/pages/catalog/components/RecommendEntryModal.vue'
import EntryCompanionsModal from '@/pages/catalog/components/EntryCompanionsModal.vue'
import type { Companion } from '@/api/social'
import { BaseToast } from '@/shared/ui'
import { computed, ref } from 'vue'
import type { Entry } from '@/entities/entry'
import { getEntryPhotos, getEntryCategoryLabel, getCatalogCategory, theatreGenres, RATING_MAX, isPlannedEntry, getCompletionLabel, isMusicType } from '@/entities/entry'
import { formatDate } from '@/shared/lib/date'
import { BaseModal, PhotoGallery } from '@/shared/ui'
import { BaseButton, BaseSelect } from '@/shared/ui'
import { usePreferencesStore } from '@/stores/preferences'
const modal = ref<InstanceType<typeof BaseModal>>()
const recommendOpen = ref(false), companionsOpen = ref(false), sent = ref(false)
const recommendModal = ref<InstanceType<typeof RecommendEntryModal>>()
const companionsModal = ref<InstanceType<typeof EntryCompanionsModal>>()
function companionsSaved(id: string, companions: Companion[]) { emit('companions', id, companions) }
async function canLeave() { return (await recommendModal.value?.canLeave() ?? true) && (await companionsModal.value?.canLeave() ?? true) }
defineExpose({ canLeave })
const props = defineProps<{
  entry: Entry
  savingVisibility?: boolean
}>()
const companionNames = computed(() => props.entry.companions?.map(person => person.name).join(', ') ?? '')
const isPlan = computed(() => isPlannedEntry(props.entry))
const completionLabel = computed(() => getCompletionLabel(props.entry.type))
const photos = computed(() => getEntryPhotos(props.entry))
const entryDate = computed(() => {
  if (isPlan.value) return props.entry.plannedDate ? `План на ${formatDate(props.entry.plannedDate)}` : 'Без даты'
  const end = formatDate(props.entry.date ?? props.entry.month ?? '')
  return props.entry.dateStart && props.entry.dateStart !== props.entry.date
    ? `${formatDate(props.entry.dateStart)} — ${end}`
    : end
})
const emit = defineEmits<{
  close: []
  visibility: [value: 'inherit' | 'private' | 'friends']
  edit: []
  complete: [entry: Entry]
  companions: [entryId: string, companions: Companion[]]
  requestDelete: []
}>()

const preferences = usePreferencesStore()
const entryTypeLabel = computed(() => getEntryCategoryLabel(props.entry))
const visibilityOptions = computed(() => [
  { value: 'inherit', label: `Как в категории: ${preferences.reviewVisibility(getCatalogCategory(props.entry.type, props.entry.customCategoryId)) === 'private' ? 'только мне' : 'друзьям'}` },
  { value: 'private', label: 'Только мне' },
  { value: 'friends', label: 'Друзьям' },
])
function changeVisibility(value: string | undefined) {
  if (value === 'inherit' || value === 'private' || value === 'friends') emit('visibility', value)
}
const theatreGenreLabel = computed(() =>
  theatreGenres.find((genre) => genre.value === props.entry.theatreGenre)?.label,
)
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-details-modal.scss"></style>
