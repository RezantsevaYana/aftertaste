<template>
  <section class="intro">
    <div>
      <h1>
        Мой каталог<span class="entry-count">{{ entries.length }}</span>
      </h1>
      <p class="intro-description">{{ ratingQuestion }}</p>
    </div>
    <BaseButton @click="addEntry"><BaseIcon icon="lucide:plus" /> Добавить запись</BaseButton>
  </section>
  <section class="catalog-section" aria-label="Каталог">
    <div class="catalog-toolbar">
      <div class="filters" role="group" aria-label="Тип контента">
        <BaseButton
          :variant="activeType === 'all' ? 'primary' : 'secondary'"
          :aria-pressed="activeType === 'all'"
          @click="activeType = 'all'"
          >Все <span>{{ entries.length }}</span></BaseButton
        >
        <BaseButton
          v-for="type in contentTypes"
          :key="type.value"
          :variant="activeType === type.value ? 'primary' : 'secondary'"
          :aria-pressed="activeType === type.value"
          @click="activeType = type.value"
          ><BaseIcon :icon="type.icon" />{{ type.label }}</BaseButton
        >
      </div>
      <div class="catalog-search-row">
        <BaseInput
          id="catalog-search"
          v-model="search"
          class="search-field"
          label="Поиск по названию"
          type="search"
          placeholder="Поиск по названию…"
        />
        <div class="catalog-date-filters">
          <DatePicker
            id="catalog-date-filter"
            v-model="dateFilter"
            label="Месяц, дата или период"
            filter-modes
            min="1900-01-01"
            max="2100-12-31"
          />
          <BaseSelect
            id="catalog-year-filter"
            v-model="yearFilter"
            label="Год"
            :options="yearOptions"
            clearable
          />
        </div>
      </div>
    </div>
    <EntryList
      :entries="visibleEntries"
      :filtered="hasFilters"
      @open="selectedEntry = $event"
      @add="addEntry"
    />
  </section>
  <EntryDetailsModal
    v-if="selectedEntry"
    :entry="selectedEntry"
    @close="selectedEntry = undefined"
    @edit="editEntry"
    @request-delete="requestEntryDeletion"
  />
  <EntryFormModal
    v-if="formOpen"
    :entry="editingEntry"
    @close="formOpen = false"
    @save="save"
  />
  <NotificationModal
    v-if="notification"
    v-bind="notification"
    @close="notification = undefined"
  />
  <ConfirmationModal
    v-if="entryToDelete"
    title="Удалить запись?"
    :message="deleteConfirmationMessage"
    confirm-label="Удалить навсегда"
    @close="entryToDelete = undefined"
    @confirm="deleteEntry"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { contentTypes, RATING_MAX } from '@/entities/entry'
import { BaseButton, BaseIcon, BaseInput, BaseSelect, DatePicker, NotificationModal, ConfirmationModal } from '@/shared/ui'
import EntryList from '@/pages/catalog/components/EntryList.vue'
import EntryFormModal from '@/pages/catalog/components/EntryFormModal.vue'
import EntryDetailsModal from '@/pages/catalog/components/EntryDetailsModal.vue'
import { useCatalog } from '@/pages/catalog/composables/useCatalog'

const ratingQuestion = computed(() =>
  RATING_MAX === 10 ? 'Сколько по десятибалльной?' : `Сколько по ${RATING_MAX}-балльной?`,
)

const {
  entries, notification, activeType, search, dateFilter, yearFilter, yearOptions, hasFilters, formOpen, editingEntry,
  selectedEntry, entryToDelete, visibleEntries, addEntry, editEntry,
  save, requestEntryDeletion, deleteEntry,
} = useCatalog()

const deleteConfirmationMessage = computed(() =>
  entryToDelete.value
    ? `«${entryToDelete.value.title}» исчезнет из каталога без возможности восстановления.`
    : '',
)
</script>

<style scoped lang="scss" src="@/styles/catalog/catalog-page.scss"></style>
