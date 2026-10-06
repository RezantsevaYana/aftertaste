<template>
  <BaseModal
    :title="entry ? 'Редактировать запись' : 'Что добавим?'"
    eyebrow="Добавить в коллекцию"
    @close="emit('close')"
    ><form class="entry-form" @submit.prevent="submit">
      <BaseSelect
        id="entry-type"
        v-model="draft.type"
        label="Тип контента"
        :options="contentTypes"
      />
      <BaseInput
        v-if="draft.type === 'album'"
        id="entry-artist"
        v-model="draft.artist"
        label="Исполнитель"
        placeholder="Имя исполнителя или название группы"
        required
        maxlength="200"
      />
      <BaseInput
        id="entry-title"
        v-model="draft.title"
        :label="titleField.label"
        :placeholder="titleField.placeholder"
        required
        maxlength="200"
      />
      <template v-if="draft.type === 'theatre'">
        <BaseSelect
          id="entry-theatre-genre"
          v-model="theatreGenre"
          label="Жанр · необязательно"
          :options="theatreGenreOptions"
        />
        <BaseInput
          id="entry-venue"
          v-model="draft.venue"
          label="Место просмотра · необязательно"
          placeholder="Название театра или площадки"
          maxlength="200"
        />
      </template>
      <RatingInput v-model="draft.rating" /><BaseTextarea
        id="entry-review"
        v-model="draft.review"
        label="Рецензия · необязательно"
        placeholder="Что понравилось, а что нет? Чем запомнилось?"
        maxlength="10000"
      /><BaseInput
        id="entry-month"
        v-model="draft.month"
        type="month"
        :label="
          draft.type === 'book'
            ? 'Когда прочитала'
            : ['theatre', 'exhibition'].includes(draft.type)
              ? 'Когда посетила'
              : draft.type === 'album'
                ? 'Когда послушала'
                : 'Когда посмотрела'
        "
        required
        min="1900-01"
        max="2100-12"
      /><PhotoInput v-model="draft.photo" @busy="photoBusy = $event" />
      <p v-if="error" class="error-text" role="alert">{{ error }}</p>
      <footer class="modal__actions">
        <BaseButton variant="secondary" @click="emit('close')"
          >Отмена</BaseButton
        ><BaseButton type="submit" :disabled="photoBusy">{{
          photoBusy
            ? 'Читаем фото…'
            : entry
              ? 'Сохранить изменения'
              : 'Добавить в каталог'
        }}</BaseButton>
      </footer>
    </form></BaseModal
  >
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Entry, EntryDraft, TheatreGenre } from '@/entities/entry'
import { contentTypes, theatreGenres } from '@/entities/entry'
import { currentMonth } from '@/shared/lib/date'
import { BaseModal } from '@/shared/ui'
import { BaseInput } from '@/shared/ui'
import { BaseSelect } from '@/shared/ui'
import { BaseTextarea } from '@/shared/ui'
import { BaseButton } from '@/shared/ui'
import { RatingInput } from '@/shared/ui'
import { PhotoInput } from '@/shared/ui'
const props = defineProps<{ entry?: Entry }>()
const emit = defineEmits<{ close: []; save: [draft: EntryDraft] }>()
const draft = reactive<EntryDraft>(
  props.entry
    ? { ...props.entry }
    : { type: 'book', title: '', rating: 7, review: '', month: currentMonth() },
)
const photoBusy = ref(false)
const titleField = computed(() => {
  switch (draft.type) {
    case 'album':
      return { label: 'Название альбома', placeholder: 'Например, «Кино»' }
    case 'exhibition':
      return { label: 'Название выставки или музея', placeholder: 'Например, «Эрмитаж»' }
    default:
      return { label: 'Название', placeholder: 'Например, «Бойцовский клуб»' }
  }
})
const theatreGenre = ref<TheatreGenre | ''>(props.entry?.theatreGenre ?? '')
const theatreGenreOptions = [
  { value: '', label: 'Не выбран' },
  ...theatreGenres,
]
const error = ref('')
function submit() {
  if (draft.type === 'album' && !draft.artist?.trim()) {
    error.value = 'Укажи исполнителя.'
    return
  }
  if (!draft.title.trim()) {
    error.value = 'Укажи название.'
    return
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.month)) {
    error.value = 'Укажи месяц и год.'
    return
  }
  emit('save', {
    ...draft,
    title: draft.title.trim(),
    review: draft.review.trim(),
    theatreGenre: draft.type === 'theatre' ? theatreGenre.value || undefined : undefined,
    venue: draft.type === 'theatre' ? draft.venue?.trim() || undefined : undefined,
    artist: draft.type === 'album' ? draft.artist?.trim() : undefined,
  })
}
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-form-modal.scss"></style>
