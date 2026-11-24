<template>
  <section class="account-settings" aria-labelledby="privacy-title" :aria-busy="preferences.saving">
    <div class="settings-heading"><h2 id="privacy-title">Приватность</h2><p>Твои правила для планов и рецензий.</p></div>
    <p class="settings-note">Названия записей и оценки доступны другим пользователям. Личные пометки «С кем» видны только тебе.</p>
    <div class="setting-row">
      <div><strong>Друзья могут видеть мои планы</strong><p>Названия и запланированные даты.</p></div>
      <BaseSwitch :model-value="preferences.settings.plansVisible" label="Друзья могут видеть мои планы" :disabled="preferences.saving" @update:model-value="setPlans" />
    </div>
    <h3>Кому видны рецензии</h3>
    <p class="settings-note">Правило по умолчанию для каждой категории. В конкретной записи можно выбрать иначе. Название и оценка остаются видимыми всем пользователям.</p>
    <div v-for="category in preferences.enabledCategories" :key="category.key" class="setting-row setting-row--select">
      <strong>{{ category.name }}</strong>
      <BaseSelect :id="`privacy-${category.key}`" :model-value="category.reviewVisibility" :label="`Рецензии: ${category.name}`" :options="visibilityOptions" :disabled="preferences.saving" @update:model-value="setVisibility(category.key, $event)" />
    </div>
    <p v-if="!preferences.enabledCategories.length" class="settings-note">Включи категории в разделе «Мои категории», чтобы настроить их правила.</p>
    <p v-if="error" class="settings-error" role="alert">{{ error }}</p>
    <BaseToast v-if="saved" message="Настройки сохранены" @close="saved = false" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { CatalogCategory } from '@/entities/entry'
import { usePreferencesStore } from '@/stores/preferences'
import BaseSelect from '@/shared/ui/form/BaseSelect.vue'
import BaseSwitch from '@/shared/ui/form/BaseSwitch.vue'
import BaseToast from '@/shared/ui/feedback/BaseToast.vue'

const preferences = usePreferencesStore()
const error = ref('')
const saved = ref(false)
const visibilityOptions = [{ value: 'private', label: 'Только мне' }, { value: 'friends', label: 'Видны друзьям' }]
async function save(action: () => Promise<void>) {
  error.value = ''; saved.value = false
  try { await action(); saved.value = true }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить настройки' }
}
function setPlans(value: boolean) { void save(() => preferences.setPlansVisible(value)) }
function setVisibility(key: CatalogCategory, value: string | undefined) {
  if (value === 'private' || value === 'friends') void save(() => preferences.setReviewVisibility(key, value))
}
async function canLeave() { return !preferences.saving }
defineExpose({ canLeave })
</script>

<style scoped lang="scss" src="@/styles/auth/account-settings.scss"></style>
