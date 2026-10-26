import { dismissModal } from '@/shared/lib/modal'
import { computed, nextTick, ref } from 'vue'
import type { ContentType, Entry, EntryDraft } from '@/entities/entry'
import { matchesEntryDateFilter, getEntryFilterYears } from '@/entities/entry'
import { createEntry, deleteEntry as deleteCatalogEntry, loadEntries, updateEntry } from '@/api/catalog'

// Состояние и сценарии одного экземпляра страницы каталога.
export function useCatalog() {
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
  const activeType = ref<ContentType | 'all'>('all')
  const search = ref<string | number>('')
  const dateFilter = ref<string | string[]>('')
  const yearFilter = ref('')
  const yearOptions = computed(() => getEntryFilterYears(entries.value).map((year) => ({ value: year, label: year })))
  const hasFilters = computed(() => !!String(search.value).trim() || !!dateFilter.value.length || !!yearFilter.value)
  const formOpen = ref(false)
  const editingEntry = ref<Entry>()
  const selectedEntry = ref<Entry>()
  const entryToDelete = ref<Entry>()
  const visibleEntries = computed(() =>
    entries.value.filter(
      (entry) =>
        (activeType.value === 'all' || entry.type === activeType.value) &&
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
    editingEntry.value = undefined
    formOpen.value = true
  }
  async function editEntry() {
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
      toast.value = isEditing ? 'Изменения сохранены' : 'Запись добавлена в каталог'
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
    save, requestEntryDeletion, deleteEntry,
  }
}
