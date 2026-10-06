<template>
  <section class="intro">
    <div>
      <h1>
        Мой каталог<span class="entry-count">{{ entries.length }}</span>
      </h1>
      <p class="intro-description">Сколько по десятибалльной?</p>
    </div>
    <BaseButton @click="addEntry">＋ Добавить запись</BaseButton>
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
          >{{ type.label }}</BaseButton
        >
      </div>
      <BaseInput
        id="catalog-search"
        v-model="search"
        class="search-field"
        label="Поиск по названию"
        type="search"
        placeholder="Поиск по названию…"
      />
    </div>
    <EntryList
      :entries="visibleEntries"
      :filtered="activeType !== 'all' || !!search"
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
    :message="'«' + entryToDelete.title + '» исчезнет из каталога без возможности восстановления.'"
    confirm-label="Удалить навсегда"
    @close="entryToDelete = undefined"
    @confirm="deleteEntry"
  />
</template>

<script setup lang="ts">
import { contentTypes } from '@/entities/entry'
import { BaseButton, BaseInput, NotificationModal, ConfirmationModal } from '@/shared/ui'
import EntryList from './components/EntryList.vue'
import EntryFormModal from './components/EntryFormModal.vue'
import EntryDetailsModal from './components/EntryDetailsModal.vue'
import { useCatalog } from './composables/useCatalog'

const {
  entries, notification, activeType, search, formOpen, editingEntry,
  selectedEntry, entryToDelete, visibleEntries, addEntry, editEntry,
  save, requestEntryDeletion, deleteEntry,
} = useCatalog()
</script>

<style scoped lang="scss" src="@/styles/catalog/catalog-page.scss"></style>
