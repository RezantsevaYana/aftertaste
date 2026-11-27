<template>
  <section class="intro">
    <div class="intro-copy">
      <h1>Моя коллекция</h1>
      <p class="intro-description">
        То, что осталось со мной. И то, что ещё впереди.
      </p>
    </div>
    <div class="catalog-add-action">
      <BaseButton class="add-vinyl" size="compact" :disabled="isLoading || loadError" @click="addEntry"><img class="add-record" src="/brand/vinyl-mark-v1.png" alt="" /> {{ addButtonLabel }}</BaseButton>
    </div>
  </section>
  <CatalogSections :model-value="activeSection" :sections="sections" @update:model-value="changeSection" />
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
          v-for="type in preferences.categoryOptions"
          :key="type.value"
          :size="controlsStuck ? 'dense' : 'compact'"
          :variant="activeType === type.value ? 'primary' : 'secondary'"
          :aria-pressed="activeType === type.value"
          @click="activeType = type.value"
          >{{ type.label }}</BaseButton
        >
        <IconButton icon="lucide:plus" label="Настроить категории" :size="controlsStuck ? 'dense' : 'compact'" @click="emit('categories')" />
      </div>
    </div>
    <div class="catalog-search-panel">
      <div class="desktop-filters">
        <CatalogFilters v-model:search="search" v-model:date="dateFilter" v-model:year="yearFilter" :year-options="yearOptions" id-prefix="catalog" />
      </div>
      <div class="mobile-search-row">
        <BaseInput id="mobile-catalog-search" v-model="search" label="Поиск по названию" type="search" />
        <BaseButton :size="controlsStuck ? 'dense' : 'compact'" variant="secondary" :aria-pressed="hasDateFilters" aria-haspopup="dialog" @click="filtersOpen = true">
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
        :section="activeSection"
        @open="selectedEntry = $event"
        @complete="completeEntry"
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
  <BaseToast v-if="completedPlan" :message="completionMessage" @close="completedPlan = undefined">
    <template #actions>
      <BaseButton size="dense" variant="secondary" :disabled="isUndoingCompletion" @click="showCompletedEntry">Посмотреть</BaseButton>
      <BaseButton size="dense" variant="secondary" :loading="isUndoingCompletion" :disabled="isSaving || isDeleting" @click="undoCompletion">Отменить</BaseButton>
    </template>
  </BaseToast>
  <EntryDetailsModal
    v-if="selectedEntry"
    ref="detailsModal"
    :entry="selectedEntry"
    :saving-visibility="isSaving"
    @visibility="changeReviewVisibility"
    @companions="updateCompanions"
    @close="selectedEntry = undefined"
    @edit="editEntry"
    @complete="completeEntry"
    @request-delete="requestEntryDeletion"
  />
  <EntryFormModal
    v-if="formOpen"
    :entry="editingEntry"
    :initial-type="newEntryType"
    :initial-custom-category-id="newEntryCustomCategoryId"
    :initial-status="activeSection"
    :completing="completingPlan"
    :genre-suggestions="genreSuggestions"
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
import { getTypeForCategory } from '@/entities/entry'
import { usePreferencesStore } from '@/stores/preferences'
import type { EntryStatus } from '@/entities/entry'
import { BaseButton, BaseIcon, BaseInput, BaseModal, NotificationModal, ConfirmationModal, VinylLoader, BaseToast, IconButton } from '@/shared/ui'
import CatalogSections from '@/pages/catalog/components/CatalogSections.vue'
import CatalogFilters from '@/pages/catalog/components/CatalogFilters.vue'
import EntryList from '@/pages/catalog/components/EntryList.vue'
import EntryFormModal from '@/pages/catalog/components/EntryFormModal.vue'
import EntryDetailsModal from '@/pages/catalog/components/EntryDetailsModal.vue'
import { useSocialStore } from '@/stores/social'
import type { Companion } from '@/api/social'
import { useCatalog } from '@/pages/catalog/composables/useCatalog'

const preferences = usePreferencesStore()
const emit = defineEmits<{
  categories: []
}>()
const section = defineModel<EntryStatus>('section', { default: 'done' })

const {
  isLoading, loadError, isSaving, isDeleting, toast, reload, resetFilters,
  entries, notification, activeType, search, dateFilter, yearFilter, yearOptions, hasFilters, formOpen, editingEntry,
  selectedEntry, entryToDelete, visibleEntries, addEntry, editEntry,
  genreSuggestions, activeSection, sections, changeSection, completingPlan, completeEntry, completedPlan,
  isUndoingCompletion, showCompletedEntry, undoCompletion,
  save, requestEntryDeletion, deleteEntry, changeReviewVisibility,
} = useCatalog(section)

const detailsModal = ref<InstanceType<typeof EntryDetailsModal>>()
function updateCompanions(id: string, companions: Companion[]) {
  entries.value = entries.value.map(entry => entry.id === id ? { ...entry, companions } : entry)
  if (selectedEntry.value?.id === id) selectedEntry.value = { ...selectedEntry.value, companions }
}
defineExpose({ reload, canLeave: async () => await detailsModal.value?.canLeave() ?? true })
const social = useSocialStore()
watch(() => social.catalogRevision, () => void reload())
const addButtonLabel = computed(() => activeSection.value === 'plan' ? 'Добавить в планы' : 'Добавить впечатление')
const completionMessage = computed(() => `«${completedPlan.value?.title}» теперь во «Впечатлениях»`)

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
const newEntryCategory = computed(() => activeType.value === 'all' ? preferences.enabledCategories[0]?.key ?? 'book' : activeType.value)
const newEntryType = computed(() => getTypeForCategory(newEntryCategory.value))
const newEntryCustomCategoryId = computed(() => newEntryCategory.value.startsWith('custom:') ? newEntryCategory.value.slice(7) : undefined)
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
