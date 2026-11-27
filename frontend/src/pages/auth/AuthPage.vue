<template>
  <section class="auth-page" :class="{ 'auth-page--profile': step === 2 }" aria-labelledby="auth-title">
    <aside class="auth-story" aria-hidden="true">
      <div>
        <h2>Своя коллекция.<br />Свои впечатления.</h2>
        <p>Для всего, что хочется запомнить: книг, фильмов, музыки и встреч с искусством.</p>
      </div>
      <div>
        <div class="auth-story-covers">
          <img src="/category-covers/avant-garde-v1/book.jpg" alt="" width="161" height="190" />
          <img src="/category-covers/avant-garde-v1/album.jpg" alt="" width="161" height="155" />
        </div>
        <div class="auth-story-caption"><img src="/brand/vinyl-mark-v1.png" alt="" width="24" height="24" />Личный культурный дневник</div>
      </div>
    </aside>
    <div class="auth-content">
      <PasswordRecovery v-if="recoveryOpen" ref="recovery" :token="resetToken" :initial-email="form.email" @back="closeRecovery" />
      <template v-else>
      <div class="auth-intro">
        <h1 id="auth-title">{{ title }}</h1>
        <p>{{ introduction }}</p>
        <ol v-if="isRegistration" class="auth-steps" aria-label="Шаги регистрации">
          <li :aria-current="step === 1 ? 'step' : undefined">1. Данные для входа</li>
          <li :aria-current="step === 2 ? 'step' : undefined">2. Профиль</li>
        </ol>
      </div>
      <form class="auth-form" novalidate :aria-busy="auth.loading" @submit.prevent="submit">
        <template v-if="step === 1">
        <BaseInput
          id="auth-email"
          v-model="form.email"
          label="Email"
          type="email"
          autocomplete="username"
          inputmode="email"
          :disabled="auth.loading"
          :error="emailError"
        />
        <BaseInput
          id="auth-password"
          v-model="form.password"
          label="Пароль"
          type="password"
          :autocomplete="passwordAutocomplete"
          :hint="passwordHint"
          :disabled="auth.loading"
          :error="passwordError"
        />
        <BaseInput
          v-if="isRegistration"
          id="auth-password-confirm"
          v-model="form.confirmPassword"
          label="Повтори пароль"
          type="password"
          autocomplete="new-password"
          :disabled="auth.loading"
          :error="confirmationError"
        />
        </template>
        <template v-else>
          <AvatarInput v-model="form.avatar" :first-name="form.firstName" :last-name="form.lastName" :disabled="auth.loading" @busy="avatarBusy = $event" />
          <div class="auth-name-row">
            <BaseInput id="auth-first-name" v-model="form.firstName" label="Имя" autocomplete="given-name" :disabled="auth.loading" :error="firstNameError" maxlength="100" />
            <BaseInput id="auth-last-name" v-model="form.lastName" label="Фамилия" autocomplete="family-name" :disabled="auth.loading" :error="lastNameError" maxlength="100" />
          </div>
          <BaseInput id="auth-handle" v-model="form.handle" label="Ник" autocomplete="nickname" :spellcheck="false" autocapitalize="none" maxlength="50" :disabled="auth.loading" :error="handleError" hint="3–50 латинских букв, цифр, точек, дефисов или подчёркиваний. Начни с буквы или цифры." />
        </template>
        <button v-if="!isRegistration" type="button" class="auth-forgot" :disabled="auth.loading" @click="recoveryOpen = true">Не помнишь пароль?</button>
        <BaseButton type="submit" :disabled="avatarBusy" :loading="auth.loading" :loading-label="loadingLabel">{{ submitLabel }}</BaseButton>
        <BaseButton v-if="step === 2" variant="secondary" :disabled="auth.loading || avatarBusy" @click="goBack">Назад</BaseButton>
        <div class="auth-switch">
          <span>{{ switchPrompt }}</span>
          <BaseButton variant="secondary" :disabled="auth.loading || avatarBusy" @click="switchMode">{{ switchLabel }}</BaseButton>
        </div>
      </form>
      </template>
    </div>
    <NotificationModal v-if="serverError" status="error" :title="isRegistration ? 'Не удалось зарегистрироваться' : 'Не удалось войти'" :message="serverError" @close="closeServerError" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import useVuelidate from '@vuelidate/core'
import { email, helpers, maxLength, minLength, required, sameAs } from '@vuelidate/validators'
import { ApiError } from '@/api/http'
import AvatarInput from '@/shared/ui/form/AvatarInput.vue'
import BaseInput from '@/shared/ui/form/BaseInput.vue'
import BaseButton from '@/shared/ui/buttons/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'
import PasswordRecovery from '@/pages/auth/components/PasswordRecovery.vue'
import NotificationModal from '@/shared/ui/modals/NotificationModal.vue'

const props = defineProps<{
  resetToken?: string
}>()
const emit = defineEmits<{
  resetDone: []
}>()
const recovery = ref<InstanceType<typeof PasswordRecovery>>()
const recoveryOpen = ref(!!props.resetToken)
function closeRecovery() { recoveryOpen.value = false; if (props.resetToken) emit('resetDone') }
const auth = useAuthStore()
const isRegistration = ref(false)
const step = ref(1)
const attempted = ref(false)
const avatarBusy = ref(false)
const serverError = ref('')
const handleServerError = ref('')
const form = reactive({ handle: '', email: '', password: '', confirmPassword: '', firstName: '', lastName: '', avatar: null as string | null })
const rules = computed(() => ({
  email: { required, email, maxLength: maxLength(254) },
  password: { required, minLength: minLength(8), maxLength: maxLength(128) },
  confirmPassword: isRegistration.value ? { required, sameAs: sameAs(form.password) } : {},
}))
const profileRules = {
  handle: { required, valid: helpers.regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,49}$/) },
  firstName: { required, maxLength: maxLength(100) },
  lastName: { required, maxLength: maxLength(100) },
}
const v$ = useVuelidate(rules, form)
const profileV$ = useVuelidate(profileRules, form)
const title = computed(() => !isRegistration.value ? 'Рады видеть тебя' : step.value === 1 ? 'Создай свою коллекцию' : 'Как тебя представить?')
const introduction = computed(() => step.value === 2
  ? 'Имя, ник и фото для твоего профиля. Их можно изменить позже.'
  : isRegistration.value ? 'Сохраняй впечатления и собирай планы на будущее.' : 'Войди, чтобы вернуться к своим впечатлениям и планам.')
const submitLabel = computed(() => !isRegistration.value ? 'Войти' : step.value === 1 ? 'Продолжить' : 'Создать аккаунт')
const loadingLabel = computed(() => isRegistration.value ? 'Создаём аккаунт…' : 'Входим…')
const switchPrompt = computed(() => isRegistration.value ? 'Уже есть аккаунт?' : 'Ещё нет аккаунта?')
const switchLabel = computed(() => isRegistration.value ? 'Войти' : 'Зарегистрироваться')
const passwordAutocomplete = computed(() => isRegistration.value ? 'new-password' : 'current-password')
const passwordHint = computed(() => isRegistration.value ? 'Минимум 8 символов' : undefined)
const emailError = computed(() => attempted.value && v$.value.email.$invalid ? 'Укажи корректный email' : '')
const passwordError = computed(() => attempted.value && v$.value.password.$invalid
  ? form.password.length > 128 ? 'Пароль слишком длинный' : 'Пароль должен содержать минимум 8 символов' : '')
const confirmationError = computed(() => attempted.value && v$.value.confirmPassword.$invalid ? 'Пароли должны совпадать' : '')
const handleError = computed(() => attempted.value && profileV$.value.handle.$invalid ? 'Укажи ник от 3 до 50 допустимых символов' : handleServerError.value)
watch(() => form.handle, () => { handleServerError.value = '' })
const firstNameError = computed(() => attempted.value && profileV$.value.firstName.$invalid ? 'Укажи имя' : '')
const lastNameError = computed(() => attempted.value && profileV$.value.lastName.$invalid ? 'Укажи фамилию' : '')

async function focusField(selector: string) {
  await nextTick()
  document.querySelector<HTMLInputElement>(selector)?.focus()
}

async function closeServerError() {
  serverError.value = ''
  if (document.activeElement === document.body) await focusField('#auth-email')
}

async function submit() {
  if (auth.loading || avatarBusy.value) return
  attempted.value = true
  serverError.value = ''
  handleServerError.value = ''
  const valid = step.value === 1 ? await v$.value.$validate() : await profileV$.value.$validate()
  if (!valid) {
    await focusField('.auth-form input[aria-invalid="true"]')
    return
  }
  if (isRegistration.value && step.value === 1) {
    step.value = 2
    attempted.value = false
    await focusField('#auth-first-name')
    return
  }
  try {
    await auth.authenticate(form.email.trim(), form.password, isRegistration.value
      ? { handle: form.handle.trim().toLowerCase(), firstName: form.firstName.trim(), lastName: form.lastName.trim(), avatar: form.avatar } : undefined)
    form.password = ''
    form.confirmPassword = ''
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 409) {
      if (cause.field === 'handle') {
        handleServerError.value = cause.message
        await focusField('#auth-handle')
        return
      }
      step.value = 1
      await focusField('#auth-email')
    }
    serverError.value = cause instanceof Error ? cause.message : 'Не удалось войти. Попробуй снова.'
  }
}

async function goBack() {
  step.value = 1
  attempted.value = false
  serverError.value = ''
  await focusField('#auth-email')
}

async function switchMode() {
  isRegistration.value = !isRegistration.value
  step.value = 1
  attempted.value = false
  serverError.value = ''
  form.password = ''
  form.confirmPassword = ''
  v$.value.$reset()
  profileV$.value.$reset()
  await focusField('#auth-email')
}
defineExpose({ canLeave: () => recovery.value?.canLeave() ?? Promise.resolve(true) })
</script>

<style scoped lang="scss" src="@/styles/auth/auth-page.scss"></style>
