<template>
  <nav class="catalog-sections" aria-label="Раздел коллекции">
    <button
      v-for="section in sections"
      :key="section.value"
      type="button"
      :aria-current="model === section.value ? 'page' : undefined"
      @click="model = section.value"
    >{{ section.label }}<span>{{ section.count }}</span></button>
  </nav>
</template>

<script setup lang="ts">
import type { EntryStatus } from '@/entities/entry'

defineProps<{
  sections: {
    value: EntryStatus
    label: string
    count: number
  }[]
}>()
const model = defineModel<EntryStatus>({ required: true })
</script>

<style scoped lang="scss" src="@/styles/catalog/catalog-sections.scss"></style>
