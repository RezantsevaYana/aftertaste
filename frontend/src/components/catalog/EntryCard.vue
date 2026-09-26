<template>
  <button
    class="entry-card"
    :class="`entry-card--${entry.type}`"
    @click="emit('open', entry)"
  >
    <div class="entry-card__art">
      <img v-if="entry.photo" :src="entry.photo" :alt="entry.title" /><template
        v-else
        ><span class="art-orbit art-orbit--one" /><span
          class="art-orbit art-orbit--two"
        /><span class="art-caption">{{
          contentTypes.find((type) => type.value === entry.type)?.singular
        }}</span
        ><span class="art-title">{{ entry.title }}</span
        ><span class="art-symbol">{{
          contentTypes.find((type) => type.value === entry.type)?.icon
        }}</span></template
      ><span class="score">{{ entry.rating }}<span>/10</span></span>
    </div>
    <div class="entry-card__body">
      <span class="entry-type">{{
        contentTypes.find((type) => type.value === entry.type)?.singular
      }}</span>
      <h3>{{ entry.title }}</h3>
      <p>
        {{
          entry.review ||
          'Оценка есть. Рецензию можно дописать позже.'
        }}
      </p>
      <span class="entry-card__link">Открыть запись <span>↗</span></span>
    </div>
  </button>
</template>

<script setup lang="ts">
import type { Entry } from '@/types/entry'
import { contentTypes } from '@/types/entry'
defineProps<{ entry: Entry }>()
const emit = defineEmits<{ open: [entry: Entry] }>()
</script>

<style scoped lang="scss" src="@/styles/catalog/EntryCard.scss"></style>
