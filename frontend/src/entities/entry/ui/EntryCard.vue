<template>
  <article class="entry-card">
    <img
      v-if="entry.photo"
      class="entry-photo"
      :src="entry.photo"
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
    <span class="entry-arrow"><BaseIcon icon="lucide:arrow-right" /></span>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EntryImage from './EntryImage.vue'
import { BaseIcon } from '@/shared/ui'
import type { Entry } from '../model/entry'
import { contentTypes } from '../model/entry'
import { RATING_MAX } from '../model/rating'
const props = defineProps<{ entry: Entry }>()
const emit = defineEmits<{ open: [entry: Entry] }>()

const ratingLabel = computed(() => `Оценка ${props.entry.rating} из ${RATING_MAX}`)

const entryTypeLabel = computed(() =>
  contentTypes.find((type) => type.value === props.entry.type)?.singular,
)
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-card.scss"></style>
