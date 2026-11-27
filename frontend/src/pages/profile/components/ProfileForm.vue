<template>
  <section class="profile-section" aria-labelledby="profile-section-title">
    <div class="profile-section-heading">
      <h2 id="profile-section-title">Профиль</h2>
      <p>Как тебя видят в Aftertaste.</p>
    </div>
    <form class="profile-form" novalidate :aria-busy="saving" @submit.prevent="save">
      <AvatarInput v-model="form.avatar" :first-name="form.firstName" :last-name="form.lastName" :disabled="saving" @busy="avatarBusy = $event" />
      <div class="profile-name-row">
        <BaseInput id="profile-first-name" v-model="form.firstName" label="Имя" autocomplete="given-name" maxlength="100" :disabled="saving" :error="firstNameError" />
        <BaseInput id="profile-last-name" v-model="form.lastName" label="Фамилия" autocomplete="family-name" maxlength="100" :disabled="saving" :error="lastNameError" />
      </div>
      <BaseInput id="profile-handle" v-model="form.handle" label="Ник" autocomplete="nickname" :spellcheck="false" autocapitalize="none" maxlength="50" :disabled="saving" :error="handleError" hint="От 3 до 50 латинских букв, цифр, точек, дефисов или подчёркиваний" />
      <div class="profile-email">
        <span>Email для входа</span>
        <p>{{ auth.user?.email }}</p>
      </div>
      <p v-if="error" class="profile-error" role="alert">{{ error }}</p>
      <div class="profile-save-row">
        <BaseButton type="submit" :loading="saving" loading-label="Сохраняем…" :disabled="!dirty || avatarBusy">Сохранить изменения</BaseButton>
        <small>Имя и фото можно менять в любое время.</small>
      </div>
    </form>
    <BaseToast v-if="saved" message="Профиль обновлён" @close="saved = false" />
    <ConfirmationModal
      v-if="confirmLeave"
      title="Выйти без сохранения?"
      message="Изменения профиля не сохранятся."
      confirm-label="Выйти без сохранения"
      cancel-label="Остаться"
      @confirm="resolveLeave(true)"
      @close="resolveLeave(false)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, required } from '@vuelidate/validators'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useUnsavedChanges } from '@/shared/composables/useUnsavedChanges'
import BaseInput from '@/shared/ui/form/BaseInput.vue'
import AvatarInput from '@/shared/ui/form/AvatarInput.vue'
import BaseButton from '@/shared/ui/buttons/BaseButton.vue'
import BaseToast from '@/shared/ui/feedback/BaseToast.vue'
import ConfirmationModal from '@/shared/ui/modals/ConfirmationModal.vue'

const auth = useAuthStore()
const form = reactive({ handle: auth.user?.handle ?? '', firstName: auth.user?.firstName ?? '', lastName: auth.user?.lastName ?? '', avatar: auth.user?.avatar ?? null })
const snapshot = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== snapshot.value)
const attempted = ref(false)
const saving = ref(false)
const avatarBusy = ref(false)
const error = ref('')
const saved = ref(false)
const handleServerError = ref('')
watch(() => form.handle, () => { handleServerError.value = '' })
const busy = computed(() => saving.value || avatarBusy.value)
const { canLeave, confirmLeave, resolveLeave } = useUnsavedChanges(dirty, busy)
const rules = { handle: { required, valid: helpers.regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,49}$/) }, firstName: { required, maxLength: maxLength(100) }, lastName: { required, maxLength: maxLength(100) } }
const v$ = useVuelidate(rules, form)
const handleError = computed(() => attempted.value && v$.value.handle.$invalid ? 'Укажи ник от 3 до 50 допустимых символов' : handleServerError.value)
const firstNameError = computed(() => attempted.value && v$.value.firstName.$invalid ? 'Укажи имя' : '')
const lastNameError = computed(() => attempted.value && v$.value.lastName.$invalid ? 'Укажи фамилию' : '')

async function save() {
  if (saving.value || avatarBusy.value) return
  attempted.value = true
  error.value = ''
  saved.value = false
  handleServerError.value = ''
  if (!await v$.value.$validate()) {
    await nextTick()
    document.querySelector<HTMLInputElement>('.profile-form input[aria-invalid="true"]')?.focus()
    return
  }
  saving.value = true
  try {
    await auth.saveProfile({ handle: form.handle.trim().toLowerCase(), firstName: form.firstName.trim(), lastName: form.lastName.trim(), avatar: form.avatar })
    form.handle = auth.user?.handle ?? ''
    form.firstName = auth.user?.firstName ?? ''
    form.lastName = auth.user?.lastName ?? ''
    snapshot.value = JSON.stringify(form)
    saved.value = true
  } catch (cause) {
    if (cause instanceof ApiError && cause.field === 'handle') {
      handleServerError.value = cause.message
      await nextTick()
      document.getElementById('profile-handle')?.focus()
      return
    }
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить профиль. Попробуй снова.'
  } finally {
    saving.value = false
  }
}

defineExpose({ canLeave })
</script>

<style scoped lang="scss" src="@/styles/auth/profile-form.scss"></style>
