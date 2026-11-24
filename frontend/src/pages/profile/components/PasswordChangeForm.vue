<template>
  <section class="password-section" aria-labelledby="password-section-title">
    <div class="password-section-heading">
      <h2 id="password-section-title">Смена пароля</h2>
      <p>Чтобы сменить пароль, введи текущий. На других устройствах нужно будет войти заново.</p>
    </div>
    <form class="password-form" novalidate :aria-busy="saving" @submit.prevent="save">
      <BaseInput id="current-password" v-model="form.currentPassword" label="Текущий пароль" type="password" autocomplete="current-password" :disabled="saving" :error="currentPasswordError" />
      <BaseInput id="new-password" v-model="form.newPassword" label="Новый пароль" type="password" autocomplete="new-password" hint="Минимум 8 символов" :disabled="saving" :error="newPasswordError" />
      <BaseInput id="repeat-password" v-model="form.confirmPassword" label="Повтори новый пароль" type="password" autocomplete="new-password" :disabled="saving" :error="confirmationError" />
      <p v-if="error" class="password-error" role="alert">{{ error }}</p>
      <div class="password-save-row"><BaseButton type="submit" :loading="saving" loading-label="Меняем пароль…">Сменить пароль</BaseButton></div>
    </form>
    <BaseToast v-if="saved" message="Пароль изменён" @close="saved = false" />
    <ConfirmationModal
      v-if="confirmLeave"
      title="Выйти без сохранения?"
      message="Введённые пароли не сохранятся."
      confirm-label="Выйти без сохранения"
      cancel-label="Остаться"
      @confirm="resolveLeave(true)"
      @close="resolveLeave(false)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import useVuelidate from '@vuelidate/core'
import { maxLength, minLength, required, sameAs } from '@vuelidate/validators'
import { changePassword } from '@/api/auth'
import { useUnsavedChanges } from '@/shared/composables/useUnsavedChanges'
import BaseInput from '@/shared/ui/form/BaseInput.vue'
import BaseButton from '@/shared/ui/buttons/BaseButton.vue'
import BaseToast from '@/shared/ui/feedback/BaseToast.vue'
import ConfirmationModal from '@/shared/ui/modals/ConfirmationModal.vue'

const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const saving = ref(false)
const attempted = ref(false)
const error = ref('')
const saved = ref(false)
const dirty = computed(() => Object.values(form).some(Boolean))
const { canLeave, confirmLeave, resolveLeave } = useUnsavedChanges(dirty, saving)
const rules = computed(() => ({
  currentPassword: { required, maxLength: maxLength(128) },
  newPassword: { required, minLength: minLength(8), maxLength: maxLength(128), different: (value: string) => value !== form.currentPassword },
  confirmPassword: { required, sameAs: sameAs(form.newPassword) },
}))
const v$ = useVuelidate(rules, form)
const currentPasswordError = computed(() => attempted.value && v$.value.currentPassword.$invalid ? 'Введи текущий пароль' : '')
const newPasswordError = computed(() => {
  if (!attempted.value || !v$.value.newPassword.$invalid) return ''
  if (form.newPassword === form.currentPassword && form.newPassword) return 'Новый пароль должен отличаться от текущего'
  return form.newPassword.length > 128 ? 'Пароль слишком длинный' : 'Минимум 8 символов'
})
const confirmationError = computed(() => attempted.value && v$.value.confirmPassword.$invalid ? 'Пароли должны совпадать' : '')

async function save() {
  if (saving.value) return
  attempted.value = true
  error.value = ''
  saved.value = false
  if (!await v$.value.$validate()) {
    await nextTick()
    document.querySelector<HTMLInputElement>('.password-form input[aria-invalid="true"]')?.focus()
    return
  }
  saving.value = true
  try {
    await changePassword(form.currentPassword, form.newPassword)
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
    attempted.value = false
    v$.value.$reset()
    saved.value = true
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сменить пароль. Попробуй снова.'
  } finally {
    saving.value = false
  }
}

defineExpose({ canLeave })
</script>

<style scoped lang="scss" src="@/styles/auth/password-change-form.scss"></style>
