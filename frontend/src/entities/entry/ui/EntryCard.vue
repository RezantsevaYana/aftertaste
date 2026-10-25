<template>
  <article :id="`entry-${entry.id}`" class="entry-card">
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
      </div>
      <span class="entry-score" :aria-label="ratingLabel">
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
import { contentTypes } from '@/entities/entry/model/entry'
import { RATING_MAX } from '@/entities/entry/model/rating'

const props = defineProps<{
  entry: Entry
}>()
const emit = defineEmits<{
  open: [entry: Entry]
}>()

const coverPhoto = computed(() => getPrimaryPhoto(props.entry))
const ratingLabel = computed(() => `Оценка ${props.entry.rating} из ${RATING_MAX}`)
const entryDescription = computed(() =>
  props.entry.type === 'album' && props.entry.artist
    ? `${props.entry.artist} · альбом`
    : contentTypes.find((type) => type.value === props.entry.type)?.singular,
)
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-card.scss"></style>
