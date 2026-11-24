<template>
  <article :id="`entry-${entry.id}`" class="entry-card" :class="cardClasses">
    <span v-if="ratingSticker" class="entry-sticker" role="img" :aria-label="ratingSticker.label">{{ ratingSticker.emoji }}</span>
    <img
      v-if="coverPhoto"
      class="entry-photo"
      :src="coverPhoto"
      :alt="entry.title"
      loading="lazy"
      decoding="async"
    />
    <EntryImage v-else class="entry-photo" :type="entry.type" />
    <div class="entry-caption">
      <div class="entry-content">
        <h3 class="entry-title">
          <button
            type="button"
            class="entry-open"
            :aria-label="`Открыть запись «${entry.title}»`"
            aria-haspopup="dialog"
            @click="emit('open', entry)"
          >{{ entry.title }}</button>
        </h3>
        <p class="entry-meta">{{ entryDescription }}</p>
        <p v-if="sourceLabel" class="entry-meta entry-source">{{ sourceLabel }}</p>
        <p v-if="plannedDateLabel" class="entry-meta">{{ plannedDateLabel }}</p>
        <button v-if="isPlan && !readonly" type="button" class="entry-complete" :aria-label="completionActionLabel" @click="emit('complete', entry)">{{ completionLabel }}<BaseIcon icon="lucide:arrow-up-right" /></button>
      </div>
      <span v-if="!isPlan" class="entry-score" :aria-label="ratingLabel">
        {{ entry.rating }}<span>/ {{ RATING_MAX }}</span>
      </span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getPrimaryPhoto } from '@/entities/entry/model/photos'
import EntryImage from '@/entities/entry/ui/EntryImage.vue'
import type { Entry } from '@/entities/entry/model/entry'
import { BaseIcon } from '@/shared/ui'
import { formatDate } from '@/shared/lib/date'
import { getEntryCategoryLabel, isPlannedEntry, getCompletionLabel, isMusicType } from '@/entities/entry/model/entry'
import { RATING_MAX } from '@/entities/entry/model/rating'

const props = defineProps<{
  entry: Entry
  readonly?: boolean
}>()
const emit = defineEmits<{
  open: [entry: Entry]
  complete: [entry: Entry]
}>()

const sourceLabel = computed(() => props.entry.source ? `${props.entry.source.kind === 'recommendation' ? 'Совет' : 'Из коллекции'}: ${props.entry.source.name}` : '')
const isPlan = computed(() => isPlannedEntry(props.entry))
const completionLabel = computed(() => getCompletionLabel(props.entry.type))
const completionActionLabel = computed(() => `${completionLabel.value}: ${props.entry.title}`)
const plannedDateLabel = computed(() => props.entry.plannedDate && isPlan.value ? formatDate(props.entry.plannedDate) : '')
const coverPhoto = computed(() => getPrimaryPhoto(props.entry))
const cardClasses = computed(() => ({
  'entry-card--favorite': props.entry.rating === RATING_MAX,
  'entry-card--low': props.entry.rating === 1,
}))
const ratingSticker = computed(() => {
  if (props.entry.rating === RATING_MAX) return { emoji: '❤️', label: 'В самое сердце' }
  if (props.entry.rating === 1) return { emoji: '💩', label: 'Совсем не понравилось' }
  return undefined
})
const ratingLabel = computed(() => `Оценка ${props.entry.rating} из ${RATING_MAX}`)
const entryDescription = computed(() => {
  const typeLabel = getEntryCategoryLabel(props.entry)
  const creator = props.entry.type === 'book' ? props.entry.author : isMusicType(props.entry.type) ? props.entry.artist : props.entry.director
  return [creator, typeLabel, props.entry.genre].filter(Boolean).join(' · ')
})
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-card.scss"></style>
