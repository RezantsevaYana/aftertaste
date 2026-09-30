<template>
  <span class="entry-cover" :class="`entry-cover--${type}`" aria-hidden="true">
    <span class="cover-shape cover-shape--first" />
    <span class="cover-shape cover-shape--second" />
    <span class="cover-line" />
  </span>
</template>

<script setup lang="ts">
import type { ContentType } from '@/types/entry'
defineProps<{ type: ContentType }>()
</script>

<style scoped lang="scss" src="@/styles/catalog/EntryCover.scss"></style>
