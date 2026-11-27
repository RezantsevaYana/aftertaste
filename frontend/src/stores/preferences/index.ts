import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createCategory, loadSettings, updateCategory, updatePrivacy, type AccountSettings, type ReviewVisibility } from '@/api/account'
import type { CatalogCategory } from '@/entities/entry'

export const usePreferencesStore = defineStore('preferences', () => {
  const settings = ref<AccountSettings>({ plansVisible: false, categories: [] })
  const ready = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  let generation = 0
  const categories = computed(() => settings.value.categories)
  const enabledCategories = computed(() => categories.value.filter(category => category.enabled))
  const categoryOptions = computed(() => enabledCategories.value.map(category => ({ value: category.key, label: category.name })))

  function reset() {
    generation++
    settings.value = { plansVisible: false, categories: [] }
    ready.value = false
    loading.value = false
    error.value = ''
  }
  async function load() {
    if (loading.value) return
    const version = generation
    loading.value = true
    error.value = ''
    try {
      const result = await loadSettings()
      if (version === generation) { settings.value = result; ready.value = true }
    } catch {
      if (version === generation) error.value = 'Не удалось загрузить настройки. Попробуй снова.'
    } finally {
      if (version === generation) loading.value = false
    }
  }
  async function save(request: () => Promise<AccountSettings>) {
    if (saving.value) return
    const version = generation
    saving.value = true
    try {
      const result = await request()
      if (version === generation) settings.value = result
    } finally {
      saving.value = false
    }
  }
  async function setCategoryEnabled(key: CatalogCategory, enabled: boolean) {
    if (saving.value) return
    const category = categories.value.find(category => category.key === key)
    if (!category) return
    const previous = category.enabled
    const version = generation
    category.enabled = enabled
    try { await save(() => updateCategory(key, { enabled })) }
    catch (cause) {
      if (version === generation) category.enabled = previous
      throw cause
    }
  }
  const setReviewVisibility = (key: CatalogCategory, reviewVisibility: ReviewVisibility) => save(() => updateCategory(key, { reviewVisibility }))
  const addCategory = (name: string) => save(() => createCategory(name))
  async function setPlansVisible(visible: boolean) {
    if (saving.value) return
    const previous = settings.value.plansVisible
    const version = generation
    settings.value.plansVisible = visible
    try { await save(() => updatePrivacy(visible)) }
    catch (cause) {
      if (version === generation) settings.value.plansVisible = previous
      throw cause
    }
  }
  function isEnabled(key: CatalogCategory) { return categories.value.some(category => category.key === key && category.enabled) }
  function reviewVisibility(key: CatalogCategory): ReviewVisibility { return categories.value.find(category => category.key === key)?.reviewVisibility ?? 'private' }

  return { settings, categories, enabledCategories, categoryOptions, ready, loading, saving, error, reset, load, setCategoryEnabled, setReviewVisibility, addCategory, setPlansVisible, isEnabled, reviewVisibility }
})
