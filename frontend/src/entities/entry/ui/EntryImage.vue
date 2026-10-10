<template>
  <span class="entry-image" :class="`entry-image--${type}`" aria-hidden="true">
    <img
      v-if="coverImage"
      class="cover-illustration"
      :src="coverImage"
      alt=""
    />
    <template v-else>
      <span class="cover-record">
        <span class="cover-label" />
      </span>
      <span class="cover-sticker" />
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ContentType } from '../model/entry'

const props = defineProps<{ type: ContentType }>()

const coverImages: Partial<Record<ContentType, string>> = {
  book: '/category-covers/book.png',
  film: '/category-covers/film-camera.png',
  series: '/category-covers/series-clapperboard.png',
}

const coverImage = computed(() => coverImages[props.type])
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-image.scss"></style>
