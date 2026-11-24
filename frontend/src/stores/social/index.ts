import { usePreferencesStore } from '@/stores/preferences'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { loadRecommendations, type Recommendation } from '@/api/social'

export const useSocialStore = defineStore('social', () => {
  const preferences = usePreferencesStore()
  const incoming = ref<Recommendation[]>([])
  const sent = ref<Recommendation[]>([])
  const ready = ref(false)
  const loading = ref(false)
  const error = ref('')
  const catalogRevision = ref(0)
  const count = computed(() => incoming.value.length)
  let generation = 0
  function reset() { generation++; incoming.value = []; sent.value = []; ready.value = false; loading.value = false; error.value = ''; catalogRevision.value = 0 }
  async function load() {
    if (loading.value) return
    const current = generation
    loading.value = true; error.value = ''
    try {
      const result = await loadRecommendations()
      if (current === generation) { incoming.value = result.incoming; sent.value = result.sent; ready.value = true }
    } catch (cause) {
      if (current === generation) error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить рекомендации'
    } finally { if (current === generation) loading.value = false }
  }
  async function catalogChanged() { const current = generation; await preferences.load(); if (current === generation) catalogRevision.value++ }
  return { incoming, sent, ready, loading, error, count, catalogRevision, reset, load, catalogChanged }
})
