import { computed, nextTick, ref } from 'vue'
import type { ContentType, Entry, EntryDraft } from '@/entities/entry'
import { matchesEntryDateFilter, getEntryFilterYears } from '@/entities/entry'
import { loadEntries, saveEntries } from '@/api/catalog'

// Состояние и сценарии одного экземпляра страницы каталога.
export function useCatalog() {
  const entries = ref<Entry[]>([])
  const notification = ref<{
    status: 'success' | 'error'
    title: string
    message: string
  }>()
  let storageAvailable = true
  try {
    entries.value = loadEntries()
  } catch {
    storageAvailable = false
    notification.value = {
      status: 'error',
      title: 'Каталог не загрузился',
      message:
        'Не удалось прочитать данные браузера. Попробуй перезагрузить страницу или проверить доступ к хранилищу. Сохранение временно недоступно, чтобы не перезаписать твои записи.',
    }
  }
  const activeType = ref<ContentType | 'all'>('all')
  const search = ref<string | number>('')
  const dateFilter = ref<string | string[]>('')
  const yearFilter = ref('')
  const yearOptions = computed(() => getEntryFilterYears(entries.value).map((year) => ({ value: year, label: year })))
  const hasFilters = computed(() => activeType.value !== 'all' || !!String(search.value).trim() || !!dateFilter.value.length || !!yearFilter.value)
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
  function addEntry() {
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
    const isEditing = !!editingEntry.value
    try {
      if (!storageAvailable) throw new Error('Storage unavailable')
      const entry: Entry = {
        ...draft,
        id: editingEntry.value?.id ?? crypto.randomUUID(),
      }
      const updated = isEditing
        ? entries.value.map((item) => (item.id === entry.id ? entry : item))
        : [entry, ...entries.value]
      saveEntries(updated)
      entries.value = updated
      formOpen.value = false
      activeType.value = 'all'
      search.value = ''
      dateFilter.value = ''
      yearFilter.value = ''
      await nextTick()
      notification.value = {
        status: 'success',
        title: isEditing ? 'Изменения сохранены' : 'Запись в каталоге',
        message:
          'Всё на месте: оценка, дата и твой комментарий. Запись сохранена в этом браузере.',
      }
    } catch {
      notification.value = {
        status: 'error',
        title: 'Не удалось сохранить',
        message:
          'Хранилище браузера недоступно или заполнено. Попробуй убрать фото и повторить. Все заполненные поля остались в форме.',
      }
    }
  }
  function requestEntryDeletion() {
    entryToDelete.value = selectedEntry.value
    selectedEntry.value = undefined
  }
  function deleteEntry() {
    const entry = entryToDelete.value
    if (!entry) return
    try {
      if (!storageAvailable) throw new Error('Storage unavailable')
      const updated = entries.value.filter((item) => item.id !== entry.id)
      saveEntries(updated)
      entries.value = updated
      entryToDelete.value = undefined
      notification.value = {
        status: 'success',
        title: 'Запись удалена',
        message: `«${entry.title}» больше нет в каталоге.`,
      }
    } catch {
      notification.value = {
        status: 'error',
        title: 'Не удалось удалить запись',
        message:
          'Хранилище браузера недоступно. Попробуй перезагрузить страницу и повторить.',
      }
    }
  }

  return {
    entries, notification, activeType, search, dateFilter, yearFilter, yearOptions, hasFilters, formOpen, editingEntry,
    selectedEntry, entryToDelete, visibleEntries, addEntry, editEntry,
    save, requestEntryDeletion, deleteEntry,
  }
}
