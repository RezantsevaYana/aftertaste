import { usePreferencesStore } from '@/stores/preferences'
import { dismissModal } from '@/shared/lib/modal'
import { computed, nextTick, ref, watch, type Ref } from 'vue'
import type { CatalogCategory, Entry, EntryDraft, EntryStatus } from '@/entities/entry'
import { matchesEntryDateFilter, getEntryFilterYears, isPlannedEntry, getSavedGenres, getCatalogCategory } from '@/entities/entry'
import { createEntry, deleteEntry as deleteCatalogEntry, loadEntries, updateEntry } from '@/api/catalog'

// Состояние и сценарии одного экземпляра страницы каталога.
export function useCatalog(activeSection: Ref<EntryStatus> = ref('done')) {
  const preferences = usePreferencesStore()
  const entries = ref<Entry[]>([])
  const notification = ref<{
    status: 'success' | 'error'
    title: string
    message: string
  }>()
  const isLoading = ref(false)
  const loadError = ref(false)
  const isSaving = ref(false)
  const isDeleting = ref(false)
  const toast = ref('')

  async function reload() {
    if (isLoading.value) return
    isLoading.value = true
    loadError.value = false
    try {
      entries.value = await loadEntries()
    } catch {
      loadError.value = true
    } finally {
      isLoading.value = false
    }
  }
  void reload()
  const genreSuggestions = computed(() => getSavedGenres(entries.value))
  const completingPlan = ref(false)
  const completedPlan = ref<Entry>()
  const isUndoingCompletion = ref(false)
  const sectionEntries = computed(() => entries.value.filter(entry => (entry.status ?? 'done') === activeSection.value))
  const sections = computed(() => [
    { value: 'done' as const, label: 'Впечатления', count: entries.value.filter(entry => !isPlannedEntry(entry) && preferences.isEnabled(getCatalogCategory(entry.type, entry.customCategoryId))).length },
    { value: 'plan' as const, label: 'Планы', count: entries.value.filter(entry => isPlannedEntry(entry) && preferences.isEnabled(getCatalogCategory(entry.type, entry.customCategoryId))).length },
  ])
  const activeType = ref<CatalogCategory | 'all'>('all')
  const search = ref<string | number>('')
  const dateFilter = ref<string | string[]>('')
  const yearFilter = ref('')
  const yearOptions = computed(() => getEntryFilterYears(sectionEntries.value).map((year) => ({ value: year, label: year })))
  const hasFilters = computed(() => !!String(search.value).trim() || !!dateFilter.value.length || !!yearFilter.value)
  const formOpen = ref(false)
  const editingEntry = ref<Entry>()
  const selectedEntry = ref<Entry>()
  const entryToDelete = ref<Entry>()
  const visibleEntries = computed(() =>
    sectionEntries.value.filter(
      (entry) =>
        preferences.isEnabled(getCatalogCategory(entry.type, entry.customCategoryId)) &&
        (activeType.value === 'all' || getCatalogCategory(entry.type, entry.customCategoryId) === activeType.value) &&
        matchesEntryDateFilter(entry, dateFilter.value, yearFilter.value) &&
        entry.title
          .toLocaleLowerCase('ru')
          .includes(String(search.value).trim().toLocaleLowerCase('ru')),
    ),
  )
  function resetFilters() {
    search.value = ''
    dateFilter.value = ''
    yearFilter.value = ''
  }
  function addEntry() {
    if (isLoading.value || loadError.value) return
    if (!preferences.enabledCategories.length) { toast.value = 'Сначала включи категории в личном кабинете'; return }
    editingEntry.value = undefined
    completingPlan.value = false
    formOpen.value = true
  }
  function changeSection(status: EntryStatus) {
    if (activeSection.value === status) return
    activeSection.value = status
  }
  watch(activeSection, resetFilters, { flush: 'sync' })
  watch(() => preferences.enabledCategories.map(category => category.key), () => {
    if (activeType.value !== 'all' && !preferences.isEnabled(activeType.value)) activeType.value = 'all'
  })
  async function completeEntry(entry: Entry) {
    if (!isPlannedEntry(entry) || isSaving.value || isUndoingCompletion.value) return
    if (selectedEntry.value) {
      await dismissModal(document.querySelector<HTMLDialogElement>('dialog:has(.detail-meta)'))
      selectedEntry.value = undefined
    }
    editingEntry.value = entry
    completingPlan.value = true
    await nextTick()
    formOpen.value = true
  }
  async function showCompletedEntry() {
    const entry = completedPlan.value
    if (!entry) return
    changeSection('done')
    resetFilters()
    if (activeType.value !== 'all') activeType.value = getCatalogCategory(entry.type, entry.customCategoryId)
    completedPlan.value = undefined
    await nextTick()
    const card = document.getElementById(`entry-${entry.id}`)
    card?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    card?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }
  async function undoCompletion() {
    if (!completedPlan.value || isUndoingCompletion.value || isSaving.value || isDeleting.value) return
    isUndoingCompletion.value = true
    try {
      const restored = await updateEntry(completedPlan.value)
      entries.value = entries.value.map(entry => entry.id === restored.id ? restored : entry)
      completedPlan.value = undefined
      toast.value = 'Запись возвращена в планы'
    } catch {
      notification.value = { status: 'error', title: 'Не удалось вернуть запись', message: 'Проверь подключение и попробуй ещё раз. Впечатление сохранено.' }
    } finally {
      isUndoingCompletion.value = false
    }
  }
  async function editEntry() {
    completingPlan.value = false
    editingEntry.value = selectedEntry.value
    selectedEntry.value = undefined
    await nextTick()
    formOpen.value = true
  }
  async function save(draft: EntryDraft) {
    if (isSaving.value) return
    isSaving.value = true
    toast.value = ''
    const isEditing = !!editingEntry.value
    const planBeforeSave = completingPlan.value && editingEntry.value ? { ...editingEntry.value } : undefined
    try {
      const entry: Entry = {
        ...draft,
        id: editingEntry.value?.id ?? crypto.randomUUID(),
      }
      const savedEntry = isEditing ? await updateEntry(entry) : await createEntry(entry)
      const updated = isEditing
        ? entries.value.map((item) => (item.id === savedEntry.id ? savedEntry : item))
        : [savedEntry, ...entries.value]
      entries.value = updated
      await dismissModal(document.querySelector<HTMLDialogElement>('dialog:has(.entry-form)'))
      formOpen.value = false
      if (!isEditing) resetFilters()
      await nextTick()
      if (!isEditing) {
        const card = document.getElementById(`entry-${savedEntry.id}`)
        card?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
        card?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
      }
      completedPlan.value = planBeforeSave
      toast.value = planBeforeSave ? '' : isEditing ? 'Изменения сохранены' : isPlannedEntry(savedEntry) ? 'Добавлено в планы' : 'Впечатление сохранено'
    } catch (error) {
      notification.value = {
        status: 'error',
        title: 'Не удалось сохранить',
        message:
          `${error instanceof Error ? error.message : 'Сервер не сохранил запись. Проверь подключение и повтори попытку.'} Все заполненные поля остались в форме.`,
      }
    } finally {
      isSaving.value = false
    }
  }
  async function changeReviewVisibility(visibility: 'inherit' | 'private' | 'friends') {
    if (!selectedEntry.value || isSaving.value) return
    const entryId = selectedEntry.value.id
    isSaving.value = true
    try {
      const saved = await updateEntry({ ...selectedEntry.value, reviewVisibility: visibility })
      entries.value = entries.value.map(entry => entry.id === saved.id ? saved : entry)
      if (selectedEntry.value?.id === entryId) selectedEntry.value = saved
      toast.value = 'Видимость рецензии сохранена'
    } catch {
      notification.value = { status: 'error', title: 'Не удалось сохранить', message: 'Попробуй изменить видимость ещё раз.' }
    } finally { isSaving.value = false }
  }
  function requestEntryDeletion() {
    entryToDelete.value = selectedEntry.value
    selectedEntry.value = undefined
  }
  async function deleteEntry() {
    const entry = entryToDelete.value
    if (!entry || isDeleting.value) return
    isDeleting.value = true
    toast.value = ''
    try {
      await deleteCatalogEntry(entry.id)
      const updated = entries.value.filter((item) => item.id !== entry.id)
      entries.value = updated
      if (completedPlan.value?.id === entry.id) completedPlan.value = undefined
      await dismissModal(Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1) ?? null)
      entryToDelete.value = undefined
      toast.value = `«${entry.title}» удалена из каталога`
    } catch {
      notification.value = {
        status: 'error',
        title: 'Не удалось удалить запись',
        message:
          'Сервер не удалил запись. Проверь подключение и повтори попытку.',
      }
    } finally {
      isDeleting.value = false
    }
  }

  return {
    isLoading, loadError, isSaving, isDeleting, toast, reload, resetFilters,
    entries, notification, activeType, search, dateFilter, yearFilter, yearOptions, hasFilters, formOpen, editingEntry,
    selectedEntry, entryToDelete, visibleEntries, addEntry, editEntry,
    genreSuggestions, activeSection, sections, changeSection, completingPlan, completeEntry, completedPlan,
    isUndoingCompletion, showCompletedEntry, undoCompletion,
    save, requestEntryDeletion, deleteEntry, changeReviewVisibility,
  }
}
