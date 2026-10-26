<template>
  <section class="intro">
    <div class="intro-copy">
      <h1>Моя коллекция</h1>
      <p class="intro-description">
        Книги, фильмы, сериалы, спектакли, музыка и выставки,<br class="intro-break" />
        которые остаются со мной.
      </p>
    </div>
    <div class="catalog-add-action">
      <BaseButton class="add-vinyl" size="compact" :disabled="isLoading || loadError" @click="addEntry"><img class="add-record" src="/brand/vinyl-mark-v1.png" alt="" /> Добавить запись</BaseButton>
    </div>
  </section>
  <section class="catalog-section" aria-label="Каталог">
    <div v-if="!isLoading && !loadError" ref="controlsSentinel" class="catalog-controls-sentinel" aria-hidden="true" />
    <div v-if="!isLoading && !loadError" class="catalog-controls" :class="{ 'catalog-controls--stuck': controlsStuck }">
    <div class="catalog-toolbar">
      <div class="filters" role="group" aria-label="Тип контента">
        <BaseButton
          :size="controlsStuck ? 'dense' : 'compact'"
          :variant="activeType === 'all' ? 'primary' : 'secondary'"
          :aria-pressed="activeType === 'all'"
          @click="activeType = 'all'"
          >Все</BaseButton
        >
        <BaseButton
          v-for="type in contentTypes"
          :key="type.value"
          :size="controlsStuck ? 'dense' : 'compact'"
          :variant="activeType === type.value ? 'primary' : 'secondary'"
          :aria-pressed="activeType === type.value"
          @click="activeType = type.value"
          >{{ type.label }}</BaseButton
        >
      </div>
    </div>
    <div class="catalog-search-panel">
      <div class="desktop-filters">
        <CatalogFilters v-model:search="search" v-model:date="dateFilter" v-model:year="yearFilter" :year-options="yearOptions" id-prefix="catalog" />
      </div>
      <div class="mobile-search-row">
        <BaseInput id="mobile-catalog-search" v-model="search" label="Поиск по названию" type="search" placeholder="Поиск по названию…" />
        <BaseButton size="compact" variant="secondary" :aria-pressed="hasDateFilters" aria-haspopup="dialog" @click="filtersOpen = true">
          <BaseIcon icon="lucide:sliders-horizontal" /> {{ filterButtonLabel }}
        </BaseButton>
      </div>
    </div>
    </div>
    <div v-if="isLoading" class="catalog-status" role="status">
      <VinylLoader />
      <p>Загружаем каталог…</p>
    </div>
    <div v-else-if="loadError" class="catalog-status">
      <p role="alert">Не удалось загрузить каталог. Проверь подключение и попробуй снова.</p>
      <BaseButton @click="reload">Попробовать снова</BaseButton>
    </div>
    <template v-else>
      <div class="catalog-results">
        <p role="status">{{ hasFilters ? 'Найдено' : 'Записей' }}: {{ visibleEntries.length }}</p>
        <BaseButton class="catalog-reset" :class="{ 'catalog-reset--hidden': !hasFilters }" :disabled="!hasFilters" size="compact" variant="secondary" @click="resetFilters"><BaseIcon icon="lucide:rotate-ccw" /> Сбросить</BaseButton>
      </div>
      <EntryList
        :entries="visibleEntries"
        :filtered="hasFilters"
        @open="selectedEntry = $event"
        @add="addEntry"
        @reset="resetFilters"
      />
    </template>
  </section>
  <BaseModal ref="filterModal" v-if="filtersOpen" title="Фильтры" @close="filtersOpen = false">
    <CatalogFilters v-model:search="search" v-model:date="dateFilter" v-model:year="yearFilter" :year-options="yearOptions" id-prefix="mobile-catalog" stacked dates-only />
    <template #actions>
      <div class="modal__actions">
        <BaseButton variant="secondary" :disabled="!hasDateFilters" @click="resetDateFilters">Сбросить даты</BaseButton>
        <BaseButton @click="filterModal?.requestClose()">Показать записи · {{ visibleEntries.length }}</BaseButton>
      </div>
    </template>
  </BaseModal>
  <BaseToast v-if="toast" :message="toast" @close="toast = ''" />
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
    :initial-type="newEntryType"
    :saving="isSaving"
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
    :loading="isDeleting"
    loading-label="Удаляем…"
    @close="entryToDelete = undefined"
    @confirm="deleteEntry"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { contentTypes } from '@/entities/entry'
import { BaseButton, BaseIcon, BaseInput, BaseModal, NotificationModal, ConfirmationModal, VinylLoader, BaseToast } from '@/shared/ui'
import CatalogFilters from '@/pages/catalog/components/CatalogFilters.vue'
import EntryList from '@/pages/catalog/components/EntryList.vue'
import EntryFormModal from '@/pages/catalog/components/EntryFormModal.vue'
import EntryDetailsModal from '@/pages/catalog/components/EntryDetailsModal.vue'
import { useCatalog } from '@/pages/catalog/composables/useCatalog'


const {
  isLoading, loadError, isSaving, isDeleting, toast, reload, resetFilters,
  entries, notification, activeType, search, dateFilter, yearFilter, yearOptions, hasFilters, formOpen, editingEntry,
  selectedEntry, entryToDelete, visibleEntries, addEntry, editEntry,
  save, requestEntryDeletion, deleteEntry,
} = useCatalog()

const controlsSentinel = ref<HTMLElement>()
const controlsStuck = ref(false)
let controlsObserver: IntersectionObserver | undefined
watch(controlsSentinel, (element) => {
  controlsObserver?.disconnect()
  controlsStuck.value = false
  if (!element) return
  controlsObserver = new IntersectionObserver(([entry]) => {
    if (entry) controlsStuck.value = !entry.isIntersecting && entry.boundingClientRect.top < 0
  })
  controlsObserver.observe(element)
}, { flush: 'post' })
onBeforeUnmount(() => controlsObserver?.disconnect())

const filterModal = ref<InstanceType<typeof BaseModal>>()
const filtersOpen = ref(false)
const newEntryType = computed(() => activeType.value === 'all' ? 'book' : activeType.value)
const activeFilterCount = computed(() => Number(!!dateFilter.value.length) + Number(!!yearFilter.value))
const hasDateFilters = computed(() => activeFilterCount.value > 0)
function resetDateFilters() {
  dateFilter.value = ''
  yearFilter.value = ''
}
const filterButtonLabel = computed(() => activeFilterCount.value ? `Фильтры · ${activeFilterCount.value}` : 'Фильтры')
const mobileQuery = window.matchMedia('(max-width: 768px)')
function closeFiltersOnDesktop() {
  if (!mobileQuery.matches) filtersOpen.value = false
}
onMounted(() => mobileQuery.addEventListener('change', closeFiltersOnDesktop))
onBeforeUnmount(() => mobileQuery.removeEventListener('change', closeFiltersOnDesktop))

const deleteConfirmationMessage = computed(() =>
  entryToDelete.value
    ? `«${entryToDelete.value.title}» исчезнет из каталога без возможности восстановления.`
    : '',
)
</script>

<style scoped lang="scss" src="@/styles/catalog/catalog-page.scss"></style>
