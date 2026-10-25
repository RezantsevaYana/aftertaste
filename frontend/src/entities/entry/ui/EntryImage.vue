<template>
  <span class="entry-image" aria-hidden="true">
    <img class="cover-illustration" :src="coverImage" alt="" loading="lazy" decoding="async" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ContentType } from '@/entities/entry/model/entry'

const props = defineProps<{
  type: ContentType
}>()

const coverImages: Record<ContentType, string> = {
  book: '/category-covers/avant-garde-v1/book.jpg',
  film: '/category-covers/avant-garde-v1/film.jpg',
  series: '/category-covers/avant-garde-v1/series.jpg',
  theatre: '/category-covers/avant-garde-v1/theatre.jpg',
  exhibition: '/category-covers/avant-garde-v1/exhibition.jpg',
  album: '/category-covers/avant-garde-v1/album.jpg',
}

const coverImage = computed(() => coverImages[props.type])
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-image.scss"></style>
