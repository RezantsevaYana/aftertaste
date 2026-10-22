<template>
  <span class="entry-image" :class="`entry-image--${type}`" aria-hidden="true">
    <img
      v-if="coverImage"
      class="cover-illustration"
      :src="coverImage"
      alt=""
    />
    <template v-else-if="type === 'album'">
      <span class="cover-record">
        <span class="cover-label" />
      </span>
      <span class="cover-sticker" />
    </template>
    <BaseIcon v-else class="cover-artwork" icon="lucide:image" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BaseIcon } from '@/shared/ui'
import type { ContentType } from '../model/entry'

const props = defineProps<{
  type: ContentType
}>()

const coverImages: Partial<Record<ContentType, string>> = {
  book: '/category-covers/book-abstract-v3.png',
  film: '/category-covers/movies.webp',
  series: '/category-covers/series.webp',
  theatre: '/category-covers/theater.webp',
  exhibition: '/category-covers/museum.webp',
}

const coverImage = computed(() => coverImages[props.type])
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-image.scss"></style>
