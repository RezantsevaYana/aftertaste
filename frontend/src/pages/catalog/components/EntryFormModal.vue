<template>
  <BaseModal
    :title="entry ? 'Редактировать запись' : 'Что добавим?'"
    :before-close="confirmCloseIfChanged"
    @close="emit('close')"
    ><form :id="formId" ref="formElement" class="entry-form" novalidate @submit.prevent="submit">
      <fieldset class="entry-form__fields" :disabled="saving" :aria-busy="saving">
      <BaseSelect
        id="entry-type"
        v-model="draft.type"
        :error="fieldErrors.type"
        label="Тип контента"
        :options="contentTypes"
      />
      <BaseInput
        v-if="draft.type === 'album'"
        id="entry-artist"
        v-model="draft.artist"
        :error="fieldErrors.artist"
        label="Исполнитель"
        placeholder="Имя исполнителя или название группы"
        required
        maxlength="200"
      />
      <BaseInput
        id="entry-title"
        v-model="draft.title"
        :error="fieldErrors.title"
        :label="titleField.label"
        :placeholder="titleField.placeholder"
        required
        maxlength="200"
      />
      <template v-if="draft.type === 'theatre'">
        <BaseSelect
          id="entry-theatre-genre"
          v-model="theatreGenre"
          :error="fieldErrors.theatreGenre"
          label="Жанр · необязательно"
          :options="theatreGenreOptions"
        />
        <BaseInput
          id="entry-venue"
          v-model="draft.venue"
        :error="fieldErrors.venue"
          label="Место просмотра · необязательно"
          placeholder="Название театра или площадки"
          maxlength="200"
        />
      </template>
      <RatingInput :error="fieldErrors.rating" v-model="draft.rating" :min="RATING_MIN" :max="RATING_MAX" /><BaseTextarea
        id="entry-review"
        v-model="draft.review"
        :error="fieldErrors.review"
        label="Рецензия · необязательно"
        placeholder="Что понравилось, а что нет? Чем запомнилось?"
        maxlength="10000"
      /><DatePicker
        id="entry-date"
        v-model="selectedDate"
        :range="isDateRange"
        :error="fieldErrors.month"
        :label="monthLabel"
        min="1900-01-01"
        max="2100-12-31"
      /><PhotoInput
        v-model="photos"
        v-model:primary-index="primaryPhotoIndex"
        @busy="photoBusy = $event"
      />
      </fieldset>
    </form>
    <template #actions>
      <div class="modal__actions">
        <BaseButton variant="secondary" :disabled="saving" @click="requestCancel"
          >Отмена
          </BaseButton>
          <BaseButton type="submit" :form="formId" :disabled="photoBusy" :loading="saving || validating || photoBusy" :loading-label="photoBusy ? 'Читаем фото…' : 'Сохраняем…'">
              {{
              photoBusy
                ? 'Читаем фото…'
                : entry
                  ? 'Сохранить изменения'
                  : 'Добавить в каталог'
            }}
        </BaseButton>
      </div>
    </template></BaseModal
  >
  <ConfirmationModal
    v-if="closeConfirmationOpen"
    title="Закрыть без сохранения?"
    message="В форме есть несохранённые изменения. Если закрыть её, они пропадут."
    confirm-label="Закрыть без сохранения"
    cancel-label="Продолжить редактирование"
    @close="closeConfirmationOpen = false"
    @confirm="emit('close')"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch, useId } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { helpers, required, maxLength } from '@vuelidate/validators'
import type { Entry, EntryDraft, TheatreGenre } from '@/entities/entry'
import { getEntryPhotos, contentTypes, theatreGenres, RATING_MIN, RATING_MAX, RATING_DEFAULT } from '@/entities/entry'
import { currentMonth, currentDate, isCalendarDate } from '@/shared/lib/date'
import { BaseModal, ConfirmationModal } from '@/shared/ui'
import { BaseInput } from '@/shared/ui'
import { BaseSelect } from '@/shared/ui'
import { BaseTextarea } from '@/shared/ui'
import { BaseButton } from '@/shared/ui'
import { RatingInput } from '@/shared/ui'
import { PhotoInput, DatePicker } from '@/shared/ui'
const props = defineProps<{
  entry?: Entry
  saving?: boolean
}>()
const emit = defineEmits<{
  close: []
  save: [draft: EntryDraft]
}>()
const draft = reactive<EntryDraft>(
  props.entry
    ? { ...props.entry }
    : { type: 'book', title: '', rating: RATING_DEFAULT, review: '', month: currentMonth() },
)
const isDateRange = computed(() => draft.type === 'book' || draft.type === 'series')
const initialDate = props.entry ? props.entry.date ?? props.entry.month : currentDate()
const selectedDate = ref<string | string[]>(
  isDateRange.value && initialDate.length === 10
    ? [props.entry?.dateStart ?? initialDate, initialDate]
    : initialDate,
)
const endDate = computed(() => Array.isArray(selectedDate.value)
  ? selectedDate.value[1] ?? ''
  : selectedDate.value)
watch(isDateRange, (range) => {
  const value = selectedDate.value
  if (range && typeof value === 'string' && isCalendarDate(value)) {
    selectedDate.value = [value, value]
  } else if (!range && Array.isArray(value)) {
    selectedDate.value = value[1] ?? value[0] ?? ''
  }
})
const photos = ref([...getEntryPhotos(draft)])
const primaryPhotoIndex = ref(draft.primaryPhotoIndex ?? 0)
const photoBusy = ref(false)
const validating = ref(false)
const monthLabel = computed(() => {
  if (draft.type === 'book') return 'Период чтения'
  if (draft.type === 'series') return 'Период просмотра'
  if (draft.type === 'theatre' || draft.type === 'exhibition') return 'Когда посетила'
  if (draft.type === 'album') return 'Когда послушала'
  return 'Когда посмотрела'
})
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
const closeConfirmationOpen = ref(false)
// Сравниваем значения, а не факт касания полей: возврат исходных данных снимает предупреждение.
const formSnapshot = computed(() => JSON.stringify({
  type: draft.type,
  title: draft.title,
  artist: draft.artist ?? '',
  venue: draft.venue ?? '',
  rating: draft.rating,
  review: draft.review,
  date: selectedDate.value,
  theatreGenre: theatreGenre.value,
  photos: photos.value,
  primaryPhotoIndex: photos.value.length ? primaryPhotoIndex.value : 0,
}))
const initialSnapshot = formSnapshot.value
const hasChanges = computed(() => formSnapshot.value !== initialSnapshot)

function confirmCloseIfChanged() {
  if (props.saving || validating.value) return false
  if (!hasChanges.value && !photoBusy.value) return true
  closeConfirmationOpen.value = true
  return false
}
function requestCancel() {
  if (confirmCloseIfChanged()) emit('close')
}

const theatreGenreOptions = [
  { value: '', label: 'Не выбран' },
  ...theatreGenres,
]
const formId = `entry-form-${useId()}`
const formElement = ref<HTMLFormElement>()
const nonBlank = (value: unknown) => typeof value === 'string' && value.trim().length > 0
const shortText = helpers.withMessage('Не больше 200 символов.', maxLength(200))
const rules = computed(() => ({
  type: {
    category: helpers.withMessage('Выбери тип контента.', (value: unknown) =>
      contentTypes.some((type) => type.value === value)),
  },
  title: {
    required: helpers.withMessage('Укажи название.', nonBlank),
    maxLength: shortText,
  },
  artist: draft.type === 'album' ? {
    required: helpers.withMessage('Укажи исполнителя.', nonBlank),
    maxLength: shortText,
  } : {},
  venue: draft.type === 'theatre' ? { maxLength: shortText } : {},
  theatreGenre: draft.type === 'theatre' ? {
    genre: helpers.withMessage('Выбери жанр из списка.', (value: unknown) =>
      value === '' || theatreGenres.some((genre) => genre.value === value)),
  } : {},
  rating: {
    range: helpers.withMessage(`Оценка: целое число от ${RATING_MIN} до ${RATING_MAX}.`,
      (value: number) => Number.isInteger(value) && value >= RATING_MIN && value <= RATING_MAX),
  },
  review: {
    maxLength: helpers.withMessage('Не больше 10 000 символов.', maxLength(10000)),
  },
  month: {
    required: helpers.withMessage('Укажи дату.', required),
    format: helpers.withMessage('Выбери дату или полный период от 01.01.1900 до 31.12.2100.',
      (value: string | string[]) => {
        const validDate = (date: string) => isCalendarDate(date) &&
          date >= '1900-01-01' && date <= '2100-12-31'
        if (Array.isArray(value)) {
          return isDateRange.value && value.length === 2 && value.every(validDate) && value[0]! <= value[1]!
        }
        return !value || value === props.entry?.month || validDate(value)
      }),
  },
}))
const validationState = computed(() => ({
  ...draft,
  month: selectedDate.value,
  artist: draft.artist ?? '',
  venue: draft.venue ?? '',
  theatreGenre: theatreGenre.value,
}))
const validation = useVuelidate(rules, validationState, { $lazy: true })
const fieldErrors = computed(() => ({
  type: String(validation.value.type.$errors[0]?.$message ?? ''),
  title: String(validation.value.title.$errors[0]?.$message ?? ''),
  artist: String(validation.value.artist.$errors[0]?.$message ?? ''),
  venue: String(validation.value.venue.$errors[0]?.$message ?? ''),
  theatreGenre: String(validation.value.theatreGenre.$errors[0]?.$message ?? ''),
  rating: String(validation.value.rating.$errors[0]?.$message ?? ''),
  review: String(validation.value.review.$errors[0]?.$message ?? ''),
  month: String(validation.value.month.$errors[0]?.$message ?? ''),
}))

async function submit() {
  if (photoBusy.value || props.saving || validating.value) return
  validating.value = true
  try {
    await nextTick()
    const valid = await validation.value.$validate()
    if (!valid) {
      await nextTick()
      formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    emit('save', {
      ...draft,
      photo: undefined,
      photos: [...photos.value],
      primaryPhotoIndex: photos.value.length ? primaryPhotoIndex.value : undefined,
      month: endDate.value.slice(0, 7),
      date: isCalendarDate(endDate.value) ? endDate.value : undefined,
      dateStart: isDateRange.value && Array.isArray(selectedDate.value) ? selectedDate.value[0] : undefined,
      title: draft.title.trim(),
      review: draft.review.trim(),
      theatreGenre: draft.type === 'theatre' ? theatreGenre.value || undefined : undefined,
      venue: draft.type === 'theatre' ? draft.venue?.trim() || undefined : undefined,
      artist: draft.type === 'album' ? draft.artist?.trim() : undefined,
    })
    await nextTick()
  } finally {
    validating.value = false
  }
}
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-form-modal.scss"></style>
