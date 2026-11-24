<template>
  <BaseModal ref="modal" title="Порекомендовать" :before-close="beforeClose" @close="emit('close')">
    <p class="social-modal-work">{{ entry.title }}</p><p class="social-modal-note">Выбери друга. Рекомендация появится у него в «Мне советуют».</p>
    <form id="recommend-entry-form" class="social-modal-form" novalidate @submit.prevent="submit">
      <BaseInput id="friend-search" v-model="query" label="Найти друга по имени или нику" type="search" maxlength="100" :disabled="saving" />
      <p v-if="loading" role="status">Ищем друзей…</p>
      <BaseSelect id="recommend-recipient" v-model="recipient" label="Кому" :options="options" :error="recipientError" :disabled="saving || loading" />
      <BaseButton v-if="cursor" size="compact" variant="secondary" :disabled="loading || saving" @click="load(true)">Показать ещё друзей</BaseButton>
      <p v-if="!loading && !friends.length" class="social-modal-note">{{ query ? 'Друга с таким именем не нашли.' : 'Пока нет друзей. Сначала добавь человека в разделе «Люди».' }}</p>
      <BaseTextarea id="recommend-note" v-model="note" label="Сообщение" maxlength="500" :error="noteError" :disabled="saving" />
      <p v-if="error" class="social-error" role="alert">{{ error }}</p>
    </form>
    <template #actions><div class="modal__actions"><BaseButton variant="secondary" :disabled="saving" @click="modal?.requestClose()">Отмена</BaseButton><BaseButton type="submit" form="recommend-entry-form" :loading="saving" :disabled="!friends.length">Отправить</BaseButton></div></template>
  </BaseModal>
  <ConfirmationModal v-if="confirmLeave" title="Закрыть без отправки?" message="Сообщение не сохранится." confirm-label="Закрыть" cancel-label="Продолжить" @confirm="resolveLeave(true)" @close="resolveLeave(false)" />
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import useVuelidate from '@vuelidate/core'
import { maxLength, required } from '@vuelidate/validators'
import type { Entry } from '@/entities/entry'
import { personName, type SocialPerson } from '@/entities/person'
import { findPeople, sendRecommendation } from '@/api/social'
import { BaseModal, BaseInput, BaseTextarea, BaseSelect, BaseButton, ConfirmationModal } from '@/shared/ui'
import { useUnsavedChanges } from '@/shared/composables/useUnsavedChanges'
import { useSocialStore } from '@/stores/social'
const props = defineProps<{
  entry: Entry
}>()
const emit = defineEmits<{
  close: []
  sent: []
}>()
const modal = ref<InstanceType<typeof BaseModal>>(), recipient = ref<string | undefined>(), note = ref(''), query = ref<string | number>('')
const friends = ref<SocialPerson[]>([]), cursor = ref<string | null>(null), loading = ref(false), saving = ref(false), attempted = ref(false), error = ref('')
let version = 0, timer: ReturnType<typeof setTimeout> | undefined
const social = useSocialStore()
const v$ = useVuelidate({ recipient: { required }, note: { maxLength: maxLength(500) } }, { recipient, note })
const recipientError = computed(() => attempted.value && v$.value.recipient.$invalid ? 'Выбери друга' : '')
const noteError = computed(() => attempted.value && v$.value.note.$invalid ? 'Не больше 500 символов' : '')
const options = computed(() => friends.value.map(person => ({ value: person.id, label: `${personName(person)} · @${person.handle}` })))
const { canLeave, confirmLeave, resolveLeave } = useUnsavedChanges(computed(() => !!recipient.value || !!note.value.trim()), saving)
function beforeClose() { if (saving.value) return false; void canLeave().then(allowed => { if (allowed) modal.value?.finish() }); return false }
async function load(more = false) {
  const current = ++version; loading.value = true; error.value = ''
  try { const result = await findPeople('friends', String(query.value), more ? cursor.value ?? undefined : undefined); if (current === version) { friends.value = more ? [...friends.value, ...result.users] : result.users; cursor.value = result.nextCursor } }
  catch (cause) { if (current === version) error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить друзей' }
  finally { if (current === version) loading.value = false }
}
async function submit() {
  if (saving.value) return
  attempted.value = true; error.value = ''
  if (!await v$.value.$validate() || !recipient.value) return
  saving.value = true
  try { await sendRecommendation(props.entry.id, recipient.value, note.value.trim()); await social.load(); emit('sent'); modal.value?.finish() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось отправить рекомендацию' }
  finally { saving.value = false }
}
watch(query, () => { clearTimeout(timer); version++; recipient.value = undefined; timer = setTimeout(() => void load(), 250) })
onMounted(() => void load())
onBeforeUnmount(() => { version++; clearTimeout(timer) })
defineExpose({ canLeave })
</script>
<style scoped lang="scss" src="@/styles/social/social-entry-modal.scss"></style>
