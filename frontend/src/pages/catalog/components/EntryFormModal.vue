<template>
  <BaseModal
    ref="modal"
    :title="modalTitle"
    :before-close="confirmCloseIfChanged"
    @close="emit('close')"
    ><form :id="formId" ref="formElement" class="entry-form" novalidate @submit.prevent="submit">
      <fieldset class="entry-form__fields" :disabled="saving" :aria-busy="saving">
      <p v-if="completing" class="entry-form__completion">Добавь оценку и дату — запись перейдёт во «Впечатления».</p>
      <BaseSelect
        id="entry-type"
        v-model="category"
        :error="fieldErrors.type"
        label="Тип контента"
        :options="categoryOptions"
      />
      <BaseSelect
        v-if="isMusic"
        id="entry-music-format"
        v-model="draft.type"
        :error="fieldErrors.type"
        label="Формат"
        :options="musicFormats"
      />
      <BaseInput
        v-if="isMusic"
        id="entry-artist"
        v-model="draft.artist"
        :error="fieldErrors.artist"
        label="Исполнитель"
        placeholder="Имя исполнителя или название группы"
        :required="!isPlan"
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
      <BaseInput
        v-if="hasDirector"
        id="entry-director"
        v-model="draft.director"
        :error="fieldErrors.director"
        label="Режиссёр"
        maxlength="200"
      />
      <BaseInput
        v-if="draft.type === 'book'"
        id="entry-author"
        v-model="draft.author"
        :error="fieldErrors.author"
        label="Автор"
        maxlength="200"
      />
      <BaseSelect
        v-if="hasGenre"
        id="entry-genre"
        v-model="draft.genre"
        :error="fieldErrors.genre"
        label="Жанр"
        :options="genreOptions"
        allow-custom
        clearable
        maxlength="200"
      />
      <template v-if="draft.type === 'theatre'">
        <BaseSelect
          id="entry-theatre-genre"
          v-model="theatreGenre"
          :error="fieldErrors.theatreGenre"
          label="Жанр"
          :options="theatreGenreOptions"
        />
        <BaseInput
          id="entry-venue"
          v-model="draft.venue"
        :error="fieldErrors.venue"
          label="Место просмотра"
          placeholder="Название театра или площадки"
          maxlength="200"
        />
      </template>
      <RatingInput v-if="!isPlan" :error="fieldErrors.rating" v-model="rating" :min="RATING_MIN" :max="RATING_MAX" /><BaseTextarea
        id="entry-review"
        v-model="draft.review"
        :error="fieldErrors.review"
        :label="isPlan ? 'Заметка для себя' : 'Рецензия'"
        :placeholder="isPlan ? 'Почему хочется вернуться к этому?' : 'Что понравилось, а что нет? Чем запомнилось?'"
        maxlength="10000"
      />
      <BaseSelect v-if="!isPlan" id="entry-review-visibility" v-model="draft.reviewVisibility" label="Кто видит рецензию" :options="visibilityOptions" />
      <DatePicker
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
                : completing
                  ? 'Сохранить впечатление'
                  : entry
                    ? 'Сохранить изменения'
                    : isPlan ? 'Добавить в планы' : 'Добавить в каталог'
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
    @confirm="discardChanges"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch, useId } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { helpers, required, maxLength } from '@vuelidate/validators'
import type { ContentType, Entry, EntryDraft, TheatreGenre, EntryStatus, CatalogCategory } from '@/entities/entry'
import { getEntryPhotos, contentTypes, theatreGenres, supportsGenre, getGenreOptions, isMusicType, catalogCategories, musicFormats, getCatalogCategory, getTypeForCategory, RATING_MIN, RATING_MAX, RATING_DEFAULT } from '@/entities/entry'
import { usePreferencesStore } from '@/stores/preferences'
import { dismissModal } from '@/shared/lib/modal'
import { currentMonth, currentDate, isCalendarDate } from '@/shared/lib/date'
import { BaseModal, ConfirmationModal } from '@/shared/ui'
import { BaseInput } from '@/shared/ui'
import { BaseSelect } from '@/shared/ui'
import { BaseTextarea } from '@/shared/ui'
import { BaseButton } from '@/shared/ui'
import { RatingInput } from '@/shared/ui'
import { PhotoInput, DatePicker } from '@/shared/ui'
const modal = ref<InstanceType<typeof BaseModal>>()
const props = defineProps<{
  entry?: Entry
  initialType?: ContentType
  initialStatus?: EntryStatus
  initialCustomCategoryId?: string
  completing?: boolean
  genreSuggestions?: Partial<Record<ContentType, string[]>>
  saving?: boolean
}>()
const emit = defineEmits<{
  close: []
  save: [draft: EntryDraft]
}>()
const preferences = usePreferencesStore()
const draft = reactive<EntryDraft>(
  props.entry
    ? { ...props.entry }
    : { type: props.initialType ?? 'book', customCategoryId: props.initialCustomCategoryId, reviewVisibility: 'inherit', title: '', rating: RATING_DEFAULT, review: '', month: currentMonth() },
)
const lastMusicType = ref<ContentType>(isMusicType(draft.type) ? draft.type : 'song')
const category = computed<CatalogCategory>({
  get: () => getCatalogCategory(draft.type, draft.customCategoryId),
  set: value => {
    if (isMusicType(draft.type)) lastMusicType.value = draft.type
    draft.customCategoryId = value.startsWith('custom:') ? value.slice(7) : undefined
    draft.type = value === 'music' ? lastMusicType.value : getTypeForCategory(value)
  },
})
const categoryOptions = computed(() => {
  const options = preferences.ready ? [...preferences.categoryOptions] : [...catalogCategories]
  if (!options.some(option => option.value === category.value)) {
    const current = preferences.categories.find(item => item.key === category.value)
    if (current) options.push({ value: current.key, label: current.name })
  }
  return options
})
const visibilityOptions = computed(() => [
  { value: 'inherit', label: `Как в категории: ${preferences.reviewVisibility(category.value) === 'private' ? 'только мне' : 'друзьям'}` },
  { value: 'private', label: 'Только мне' },
  { value: 'friends', label: 'Друзьям' },
])
const isMusic = computed(() => isMusicType(draft.type))
const hasDirector = computed(() => ['film', 'series', 'theatre'].includes(draft.type))
const hasGenre = computed(() => supportsGenre(draft.type))
const genreOptions = computed(() => {
  const suggestions = props.genreSuggestions ?? {}
  const savedGenres = isMusic.value
    ? [...(suggestions.song ?? []), ...(suggestions.album ?? [])]
    : suggestions[draft.type]
  return getGenreOptions(draft.type, savedGenres)
})
watch(() => draft.type, (type, previousType) => {
  if (!isMusicType(type) || !isMusicType(previousType)) draft.genre = undefined
})
const isPlan = computed(() => !props.completing && (props.entry?.status ?? props.initialStatus) === 'plan')
const modalTitle = computed(() => props.completing ? 'Как впечатления?' : props.entry ? 'Редактировать запись' : isPlan.value ? 'Добавить в планы' : 'Что добавим?')
const rating = ref(props.completing ? 0 : props.entry?.rating ?? RATING_DEFAULT)
const isDateRange = computed(() => !isPlan.value && (draft.type === 'book' || draft.type === 'series'))
const initialDate = props.completing ? currentDate() : isPlan.value ? props.entry?.plannedDate ?? '' : props.entry?.date ?? props.entry?.month ?? currentDate()
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
  if (isPlan.value) return 'Планируемая дата'
  if (draft.type === 'book') return 'Период чтения'
  if (draft.type === 'series') return 'Период просмотра'
  if (['theatre', 'exhibition', 'concert', 'lecture'].includes(draft.type)) return 'Когда посетила'
  if (draft.type === 'custom') return 'Когда это было'
  if (isMusic.value || draft.type === 'podcast') return 'Когда послушала'
  return 'Когда посмотрела'
})
const titleField = computed(() => {
  switch (draft.type) {
    case 'concert':
      return { label: 'Название концерта', placeholder: 'Концерт или выступление' }
    case 'podcast':
      return { label: 'Название подкаста', placeholder: 'Подкаст или выпуск' }
    case 'lecture':
      return { label: 'Название лекции', placeholder: 'Тема или название лекции' }
    case 'custom':
      return { label: 'Название', placeholder: 'Что хочется сохранить?' }
    case 'song':
      return { label: 'Название трека', placeholder: 'Например, «Кукушка»' }
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
  customCategoryId: draft.customCategoryId,
  reviewVisibility: draft.reviewVisibility ?? 'inherit',
  title: draft.title,
  artist: draft.artist ?? '',
  author: draft.author ?? '',
  director: draft.director ?? '',
  genre: draft.genre ?? '',
  venue: draft.venue ?? '',
  rating: rating.value,
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
async function discardChanges() {
  await dismissModal(Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1) ?? null)
  modal.value?.finish()
}
function requestCancel() {
  modal.value?.requestClose()
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
      contentTypes.some((type) => type.value === value) && (value !== 'custom' || !!draft.customCategoryId)),
  },
  title: {
    required: helpers.withMessage('Укажи название.', nonBlank),
    maxLength: shortText,
  },
  artist: isMusic.value ? {
    ...(isPlan.value ? {} : { required: helpers.withMessage('Укажи исполнителя.', nonBlank) }),
    maxLength: shortText,
  } : {},
  author: draft.type === 'book' ? { maxLength: shortText } : {},
  director: hasDirector.value ? { maxLength: shortText } : {},
  genre: hasGenre.value ? { maxLength: shortText } : {},
  venue: draft.type === 'theatre' ? { maxLength: shortText } : {},
  theatreGenre: draft.type === 'theatre' ? {
    genre: helpers.withMessage('Выбери жанр из списка.', (value: unknown) =>
      value === '' || theatreGenres.some((genre) => genre.value === value)),
  } : {},
  rating: isPlan.value ? {} : {
    range: helpers.withMessage(`Оценка: целое число от ${RATING_MIN} до ${RATING_MAX}.`,
      (value: number) => Number.isInteger(value) && value >= RATING_MIN && value <= RATING_MAX),
  },
  review: {
    maxLength: helpers.withMessage('Не больше 10 000 символов.', maxLength(10000)),
  },
  month: {
    ...(isPlan.value ? {} : { required: helpers.withMessage('Укажи дату.', required) }),
    format: helpers.withMessage('Выбери дату или полный период от 01.01.1900 до 31.12.2100.',
      (value: string | string[]) => {
        const validDate = (date: string) => isCalendarDate(date) &&
          date >= '1900-01-01' && date <= '2100-12-31'
        if (Array.isArray(value)) {
          return isDateRange.value && value.length === 2 && value.every(validDate) && value[0]! <= value[1]!
        }
        return !value || (!isPlan.value && value === props.entry?.month) || validDate(value)
      }),
  },
}))
const validationState = computed(() => ({
  ...draft,
  rating: rating.value,
  month: selectedDate.value,
  artist: draft.artist ?? '',
  author: draft.author ?? '',
  director: draft.director ?? '',
  genre: draft.genre ?? '',
  venue: draft.venue ?? '',
  theatreGenre: theatreGenre.value,
}))
const validation = useVuelidate(rules, validationState, { $lazy: true })
const fieldErrors = computed(() => ({
  type: String(validation.value.type.$errors[0]?.$message ?? ''),
  title: String(validation.value.title.$errors[0]?.$message ?? ''),
  artist: String(validation.value.artist.$errors[0]?.$message ?? ''),
  author: String(validation.value.author.$errors[0]?.$message ?? ''),
  director: String(validation.value.director.$errors[0]?.$message ?? ''),
  genre: String(validation.value.genre.$errors[0]?.$message ?? ''),
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
      status: isPlan.value ? 'plan' : 'done',
      plannedDate: isPlan.value ? endDate.value || undefined : props.entry?.plannedDate,
      rating: isPlan.value ? null : rating.value,
      month: isPlan.value ? null : endDate.value.slice(0, 7),
      date: !isPlan.value && isCalendarDate(endDate.value) ? endDate.value : undefined,
      dateStart: isDateRange.value && Array.isArray(selectedDate.value) ? selectedDate.value[0] : undefined,
      title: draft.title.trim(),
      review: draft.review.trim(),
      theatreGenre: draft.type === 'theatre' ? theatreGenre.value || undefined : undefined,
      venue: draft.type === 'theatre' ? draft.venue?.trim() || undefined : undefined,
      artist: isMusic.value ? draft.artist?.trim() || undefined : undefined,
      author: draft.type === 'book' ? draft.author?.trim() || undefined : undefined,
      director: hasDirector.value ? draft.director?.trim() || undefined : undefined,
      genre: hasGenre.value ? draft.genre?.trim() || undefined : undefined,
    })
    await nextTick()
  } finally {
    validating.value = false
  }
}
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-form-modal.scss"></style>
