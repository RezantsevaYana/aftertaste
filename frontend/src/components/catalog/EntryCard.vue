<template>
  <button class="entry-card" @click="emit('open', entry)">
    <img
      v-if="entry.photo"
      class="entry-photo"
      :src="entry.photo"
      :alt="entry.title"
    />
    <EntryCover v-else class="entry-photo" :type="entry.type" />
    <span class="entry-content">
      <span class="entry-type">{{
        contentTypes.find((type) => type.value === entry.type)?.singular
      }}</span>
      <span class="entry-title">{{ entry.title }}</span>
      <span class="entry-review">{{
        entry.review || 'Рецензии пока нет.'
      }}</span>
    </span>
    <span class="entry-score" :aria-label="`Оценка ${entry.rating} из 10`"
      >{{ entry.rating }}<span>/ 10</span></span
    >
    <span class="entry-arrow" aria-hidden="true">↗</span>
  </button>
</template>

<script setup lang="ts">
import EntryCover from './EntryCover.vue'
import type { Entry } from '@/types/entry'
import { contentTypes } from '@/types/entry'
defineProps<{ entry: Entry }>()
const emit = defineEmits<{ open: [entry: Entry] }>()
</script>

<style scoped lang="scss" src="@/styles/catalog/EntryCard.scss"></style>
