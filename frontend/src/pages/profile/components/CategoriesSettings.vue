<template>
  <section class="account-settings" aria-labelledby="categories-title" :aria-busy="preferences.saving">
    <div class="settings-heading"><h2 id="categories-title">Мои категории</h2><p>Оставь то, что собираешь. Или добавь свою категорию.</p></div>
    <p class="settings-note">Отключённая категория исчезнет из каталога. Все её записи сохранятся — вернуться к ним можно в любой момент.</p>
    <div class="category-list">
      <div v-for="category in categoryRows" :key="category.key" class="category-row">
        <span class="category-symbol"><BaseIcon :icon="category.icon" /></span>
        <div class="category-info"><strong>{{ category.name }}</strong><small>{{ category.countLabel }}<span v-if="category.custom"> · Своя категория</span></small></div>
        <BaseSwitch :model-value="category.enabled" :label="`Категория «${category.name}»`" :disabled="preferences.saving || preferences.loading" @update:model-value="toggle(category.key, $event)" />
      </div>
    </div>
    <div class="add-category">
      <h3>Не нашлось нужной?</h3><p>Создай свою категорию — она появится только в твоей коллекции.</p>
      <form class="add-category-form" novalidate @submit.prevent="add">
        <BaseInput id="custom-category-name" v-model="name" label="Название категории" hint="Например, «Фестивали»" maxlength="60" :disabled="preferences.saving || preferences.loading" :error="nameError" />
        <BaseButton type="submit" :disabled="preferences.loading" :loading="preferences.saving" loading-label="Сохраняем…">Добавить категорию</BaseButton>
      </form>
    </div>
    <p v-if="preferences.error" class="settings-error" role="alert">{{ preferences.error }}</p>
    <p v-if="error" class="settings-error" role="alert">{{ error }}</p>
    <BaseToast v-if="message" :message="message" @close="message = ''" />
    <ConfirmationModal v-if="confirmLeave" title="Выйти без сохранения?" message="Название новой категории не сохранится." confirm-label="Выйти без сохранения" cancel-label="Остаться" @confirm="resolveLeave(true)" @close="resolveLeave(false)" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import useVuelidate from '@vuelidate/core'
import { required, maxLength } from '@vuelidate/validators'
import type { CatalogCategory } from '@/entities/entry'
import { usePreferencesStore } from '@/stores/preferences'
import { useUnsavedChanges } from '@/shared/composables/useUnsavedChanges'
import BaseIcon from '@/shared/ui/icons/BaseIcon.vue'
import BaseInput from '@/shared/ui/form/BaseInput.vue'
import BaseSwitch from '@/shared/ui/form/BaseSwitch.vue'
import BaseButton from '@/shared/ui/buttons/BaseButton.vue'
import BaseToast from '@/shared/ui/feedback/BaseToast.vue'
import ConfirmationModal from '@/shared/ui/modals/ConfirmationModal.vue'

const preferences = usePreferencesStore()
onMounted(() => { void preferences.load() })
const plural = new Intl.PluralRules('ru')
const categoryRows = computed(() => preferences.categories.map(category => {
  const form = plural.select(category.count)
  const word = form === 'one' ? 'запись' : form === 'few' ? 'записи' : 'записей'
  return { ...category, countLabel: `${category.count} ${word}` }
}))
const name = ref('')
const attempted = ref(false)
const error = ref('')
const message = ref('')
const rules = { name: { required, maxLength: maxLength(60) } }
const v$ = useVuelidate(rules, { name })
const nameError = computed(() => attempted.value && v$.value.name.$invalid ? 'Укажи название, до 60 символов' : '')
const { canLeave, confirmLeave, resolveLeave } = useUnsavedChanges(computed(() => !!name.value), computed(() => preferences.saving))

async function toggle(key: CatalogCategory, enabled: boolean) {
  error.value = ''
  try { await preferences.setCategoryEnabled(key, enabled); message.value = enabled ? 'Категория включена' : 'Категория скрыта. Записи сохранены.' }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить настройки' }
}
async function add() {
  if (preferences.saving) return
  attempted.value = true
  error.value = ''
  if (!await v$.value.$validate()) { await nextTick(); document.getElementById('custom-category-name')?.focus(); return }
  try {
    await preferences.addCategory(name.value.trim())
    name.value = ''; attempted.value = false; v$.value.$reset(); message.value = 'Своя категория добавлена'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось добавить категорию' }
}
defineExpose({ canLeave })
</script>

<style scoped lang="scss" src="@/styles/auth/account-settings.scss"></style>
