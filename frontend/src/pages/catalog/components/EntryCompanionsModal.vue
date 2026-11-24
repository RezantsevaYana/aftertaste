<template>
  <BaseModal ref="modal" title="С кем" :before-close="beforeClose" @close="emit('close')">
    <p class="social-modal-note">Видно только тебе. Отметка не отправляет уведомлений и не меняет чужую коллекцию.</p>
    <div class="companion-chips"><span v-for="(person, index) in draft" :key="person.userId ?? person.name" class="companion-chip">{{ person.name }}<IconButton icon="lucide:x" :label="`Убрать ${person.name}`" :disabled="saving" @click="draft.splice(index, 1)" /></span><span v-if="!draft.length" class="social-modal-note">Никто не выбран</span></div>
    <form id="companions-form" class="social-modal-form" novalidate @submit.prevent="submit">
      <BaseInput id="companion-name" v-model="name" label="Имя человека без аккаунта" maxlength="80" :disabled="saving" :error="nameError" @keydown.enter.prevent="addName()" />
      <BaseButton variant="secondary" size="compact" :disabled="saving" @click="addName()">Добавить имя</BaseButton>
      <BaseInput id="companion-search" v-model="query" label="Найти пользователя" type="search" maxlength="100" :disabled="saving" />
      <p v-if="loading" role="status">Ищем людей…</p>
      <label v-for="person in people" :key="person.id" class="companion-choice"><UserAvatar :avatar="person.avatar" :first-name="person.firstName" :last-name="person.lastName" /><span>{{ personName(person) }}<small>@{{ person.handle }}</small></span><input type="checkbox" :checked="selectedIds.has(person.id)" :disabled="saving" @change="toggle(person, $event)" /></label>
      <BaseButton v-if="cursor" variant="secondary" size="compact" :disabled="loading || saving" @click="load(true)">Показать ещё</BaseButton>
      <p v-if="!loading && !people.length" class="social-modal-note">Пользователей не нашли. Можно вписать имя.</p>
      <p v-if="error" class="social-error" role="alert">{{ error }}</p>
    </form>
    <template #actions><div class="modal__actions"><BaseButton variant="secondary" :disabled="saving" @click="modal?.requestClose()">Отмена</BaseButton><BaseButton type="submit" form="companions-form" :loading="saving">Сохранить</BaseButton></div></template>
  </BaseModal>
  <ConfirmationModal v-if="confirmLeave" title="Закрыть без сохранения?" message="Личная пометка не сохранится." confirm-label="Закрыть" cancel-label="Продолжить" @confirm="resolveLeave(true)" @close="resolveLeave(false)" />
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import useVuelidate from '@vuelidate/core'
import { maxLength, required } from '@vuelidate/validators'
import type { Entry } from '@/entities/entry'
import { personName, type SocialPerson } from '@/entities/person'
import { findPeople, saveCompanions, type Companion } from '@/api/social'
import { BaseModal, BaseInput, BaseButton, IconButton, ConfirmationModal } from '@/shared/ui'
import UserAvatar from '@/shared/ui/avatar/UserAvatar.vue'
import { useUnsavedChanges } from '@/shared/composables/useUnsavedChanges'
const props = defineProps<{
  entry: Entry
}>()
const emit = defineEmits<{
  close: []
  saved: [entryId: string, companions: Companion[]]
}>()
const draft = ref<Companion[]>((props.entry.companions ?? []).map(person => ({ ...person })))
const initial = JSON.stringify(draft.value), name = ref<string | number>(''), query = ref<string | number>(''), attempted = ref(false)
const people = ref<SocialPerson[]>([]), cursor = ref<string | null>(null), loading = ref(false), saving = ref(false), error = ref('')
const modal = ref<InstanceType<typeof BaseModal>>()
let version = 0, timer: ReturnType<typeof setTimeout> | undefined
const v$ = useVuelidate({ name: { required, maxLength: maxLength(80) } }, { name })
const nameError = computed(() => attempted.value && v$.value.name.$invalid ? 'Укажи имя от 1 до 80 символов' : '')
const selectedIds = computed(() => new Set(draft.value.map(person => person.userId).filter(Boolean)))
const { canLeave, confirmLeave, resolveLeave } = useUnsavedChanges(computed(() => JSON.stringify(draft.value) !== initial || !!String(name.value).trim()), saving)
function beforeClose() { if (saving.value) return false; void canLeave().then(allowed => { if (allowed) modal.value?.finish() }); return false }
async function addName() {
  attempted.value = true
  if (!await v$.value.$validate()) return false
  const value = String(name.value).trim()
  if (!value) return false
  if (draft.value.length >= 20) { error.value = 'Можно отметить до 20 человек'; return false }
  if (!draft.value.some(person => person.name.toLocaleLowerCase('ru') === value.toLocaleLowerCase('ru'))) draft.value.push({ userId: null, name: value })
  name.value = ''; attempted.value = false; return true
}
function toggle(person: SocialPerson, event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.checked
  if (selected && draft.value.length < 20) draft.value.push({ userId: person.id, name: personName(person) })
  else if (!selected) draft.value = draft.value.filter(item => item.userId !== person.id)
  else { input.checked = false; error.value = 'Можно отметить до 20 человек' }
}
async function load(more = false) {
  const current = ++version; loading.value = true
  try { const result = await findPeople('search', String(query.value), more ? cursor.value ?? undefined : undefined); if (current === version) { people.value = more ? [...people.value, ...result.users] : result.users; cursor.value = result.nextCursor } }
  catch (cause) { if (current === version) error.value = cause instanceof Error ? cause.message : 'Не удалось найти людей' }
  finally { if (current === version) loading.value = false }
}
async function submit() {
  if (saving.value) return
  if (String(name.value).trim() && !await addName()) return
  saving.value = true; error.value = ''
  try { const result = await saveCompanions(props.entry.id, draft.value); emit('saved', props.entry.id, result.companions); modal.value?.finish() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить пометку' }
  finally { saving.value = false }
}
watch(query, () => { clearTimeout(timer); version++; timer = setTimeout(() => void load(), 250) })
onMounted(() => void load())
onBeforeUnmount(() => { version++; clearTimeout(timer) })
defineExpose({ canLeave })
</script>
<style scoped lang="scss" src="@/styles/social/social-entry-modal.scss"></style>
