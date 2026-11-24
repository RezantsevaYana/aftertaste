<template>
  <div class="catalog-filter-fields" :class="{ 'catalog-filter-fields--stacked': stacked }">
    <div v-if="!datesOnly" class="search-field">
      <BaseIcon class="search-icon" icon="lucide:search" />
      <BaseInput :id="`${idPrefix}-search`" v-model="search" label="Поиск по названию" type="search" />
    </div>
    <div class="date-fields">
      <DatePicker :id="`${idPrefix}-date-filter`" v-model="date" label="Месяц, дата или период" filter-modes min="1900-01-01" max="2100-12-31" />
      <BaseSelect :id="`${idPrefix}-year-filter`" v-model="year" label="Год" :options="yearOptions" clearable />
    </div>
  </div>
</template>

<script setup lang="ts">
import { BaseIcon, BaseInput, BaseSelect, DatePicker } from '@/shared/ui'

defineProps<{
  idPrefix: string
  yearOptions: readonly { value: string; label: string }[]
  stacked?: boolean
  datesOnly?: boolean
}>()
const search = defineModel<string | number>('search', { required: true })
const date = defineModel<string | string[]>('date', { required: true })
const year = defineModel<string>('year', { required: true })
</script>

<style scoped lang="scss" src="@/styles/catalog/catalog-filters.scss"></style>
