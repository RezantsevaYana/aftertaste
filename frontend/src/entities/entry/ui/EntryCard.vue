<template>
  <article class="entry-card">
    <img
      v-if="coverPhoto"
      class="entry-photo"
      :src="coverPhoto"
      :alt="entry.title"
    />
    <EntryImage v-else class="entry-photo" :type="entry.type" />

    <div class="entry-content">
      <span class="entry-type">{{ entryTypeLabel }}</span>
      <h3 class="entry-title">
        <button
          type="button"
          class="entry-open"
          :aria-label="`Открыть запись «${entry.title}»`"
          aria-haspopup="dialog"
          @click="emit('open', entry)"
        >{{ entry.title }}</button>
      </h3>
      <p v-if="entry.type === 'album'" class="entry-artist">{{ entry.artist }}</p>
      <p class="entry-review">{{
        entry.review || 'Рецензии пока нет.'
      }}</p>
    </div>
    <span class="entry-score" :aria-label="ratingLabel"
      >{{ entry.rating }}<span>/ {{ RATING_MAX }}</span></span
    >
    <span class="entry-arrow" aria-hidden="true"><BaseIcon icon="lucide:arrow-right" /></span>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getPrimaryPhoto } from '@/entities/entry/model/photos'
import EntryImage from './EntryImage.vue'
import { BaseIcon } from '@/shared/ui'
import type { Entry } from '../model/entry'
import { contentTypes } from '../model/entry'
import { RATING_MAX } from '../model/rating'
const props = defineProps<{
  entry: Entry
}>()
const emit = defineEmits<{
  open: [entry: Entry]
}>()

const coverPhoto = computed(() => getPrimaryPhoto(props.entry))
const ratingLabel = computed(() => `Оценка ${props.entry.rating} из ${RATING_MAX}`)

const entryTypeLabel = computed(() =>
  contentTypes.find((type) => type.value === props.entry.type)?.singular,
)
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-card.scss"></style>
