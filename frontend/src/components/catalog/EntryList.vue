<template>
  <div v-if="!entries.length" class="empty-state">
    <span>✳</span>
    <h2>
      {{ filtered ? 'Ничего не нашлось' : 'Ну что, начнём?' }}
    </h2>
    <p>
      {{
        filtered
          ? 'Попробуй другое название или переключи фильтр.'
          : 'Добавь книгу, фильм, сериал или спектакль. Поделись своим мнением.'
      }}
    </p>
    <BaseButton @click="emit('add')">＋ Добавить запись</BaseButton>
  </div>
  <section v-for="group in groups" :key="group.month" class="month-group">
    <div class="month-heading">
      <h2>{{ formatMonth(group.month) }}</h2>
      <span>{{ group.entries.length }}</span>
      <div />
    </div>
    <div class="entry-grid">
      <EntryCard
        v-for="entry in group.entries"
        :key="entry.id"
        :entry="entry"
        @open="emit('open', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Entry } from '@/types/entry'
import { formatMonth } from '@/types/entry'
import EntryCard from './EntryCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
const props = defineProps<{ entries: Entry[]; filtered: boolean }>()
const emit = defineEmits<{ open: [entry: Entry]; add: [] }>()
const groups = computed(() => {
  const result = new Map<string, Entry[]>()
  for (const entry of [...props.entries].sort((a, b) =>
    b.month.localeCompare(a.month),
  )) {
    const group = result.get(entry.month) ?? []
    group.push(entry)
    result.set(entry.month, group)
  }
  return Array.from(result, ([month, entries]) => ({ month, entries }))
})
</script>

<style scoped lang="scss" src="@/styles/catalog/EntryList.scss"></style>
