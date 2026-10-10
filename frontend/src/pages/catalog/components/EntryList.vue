<template>
  <div v-if="!entries.length" class="empty-state">
    <h2>
      {{ filtered ? 'Ничего не нашлось' : 'Ну что, начнём?' }}
    </h2>
    <p>
      {{
        filtered
          ? 'Попробуй другое название или переключи фильтр.'
          : 'Добавь первую запись и поделись своими впечатлениями.'
      }}
    </p>
    <BaseButton @click="emit('add')"><BaseIcon icon="lucide:plus" /> Добавить запись</BaseButton>
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
import type { Entry } from '@/entities/entry'
import { formatMonth } from '@/shared/lib/date'
import { EntryCard } from '@/entities/entry'
import { BaseButton, BaseIcon } from '@/shared/ui'
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

<style scoped lang="scss" src="@/styles/catalog/entry-list.scss"></style>
