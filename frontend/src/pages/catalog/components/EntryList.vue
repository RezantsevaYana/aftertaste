<template>
  <div v-if="!entries.length" class="empty-state empty-state--welcome">
    <div v-if="!filtered" class="empty-state-categories" aria-hidden="true">
      <BaseIcon icon="lucide:book-open" />
      <BaseIcon icon="lucide:clapperboard" />
      <BaseIcon icon="lucide:disc-3" />
      <BaseIcon icon="lucide:drama" />
      <BaseIcon icon="lucide:image" />
    </div>
    <h2>
      {{ emptyTitle }}
    </h2>
    <p>
      {{ emptyDescription }}
    </p>
    <BaseButton v-if="!filtered" class="empty-add-record" @click="emit('add')"><BaseIcon icon="lucide:disc-3" /> {{ section === 'plan' ? 'Добавить в планы' : 'Добавить запись' }}</BaseButton>
  </div>
  <section v-for="group in groups" :key="group.key" class="month-group">
    <div class="month-heading">
      <h2>{{ group.title }}</h2>
      <span>{{ group.entries.length }}</span>
    </div>
    <div class="entry-grid">
      <EntryCard
        v-for="entry in group.entries"
        :key="entry.id"
        :entry="entry"
        @open="emit('open', $event)"
        @complete="emit('complete', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Entry, EntryStatus } from '@/entities/entry'
import { formatMonth } from '@/shared/lib/date'
import { EntryCard } from '@/entities/entry'
import { BaseButton, BaseIcon } from '@/shared/ui'

const props = defineProps<{
  entries: Entry[]
  filtered: boolean
  section?: EntryStatus
}>()
const emit = defineEmits<{
  open: [entry: Entry]
  complete: [entry: Entry]
  add: []
  reset: []
}>()

const emptyTitle = computed(() => props.filtered ? 'Ничего не нашлось' : props.section === 'plan' ? 'Что хочется попробовать?' : 'Ну что, начнём?')
const emptyDescription = computed(() => props.filtered ? 'Попробуй другое название или сбрось поиск и даты.' : props.section === 'plan' ? 'Сохрани книгу, фильм или другое впечатление на будущее. Дату можно выбрать позже.' : 'Добавь первую запись и поделись своими впечатлениями.')
const groups = computed(() => {
  if (props.section === 'plan') return [
    { key: 'dated', title: 'С датой', entries: props.entries.filter(entry => entry.plannedDate).sort((a, b) => a.plannedDate!.localeCompare(b.plannedDate!)) },
    { key: 'undated', title: 'Когда захочется', entries: props.entries.filter(entry => !entry.plannedDate) },
  ].filter(group => group.entries.length)
  const result = new Map<string, Entry[]>()
  for (const entry of [...props.entries].sort((a, b) =>
    (b.month ?? '').localeCompare(a.month ?? ''),
  )) {
    const month = entry.month ?? ''
    const group = result.get(month) ?? []
    group.push(entry)
    result.set(month, group)
  }
  return Array.from(result, ([month, entries]) => ({ key: month, title: formatMonth(month), entries }))
})
</script>

<style scoped lang="scss" src="@/styles/catalog/entry-list.scss"></style>
