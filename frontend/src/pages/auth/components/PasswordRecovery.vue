<template>
  <div class="password-recovery">
    <h1 id="auth-title">{{ title }}</h1>
    <template v-if="stage === 'checking'">
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-else role="status"><VinylLoader /> Проверяем ссылку…</p>
      <BaseButton v-if="error" @click="checkLink">Попробовать снова</BaseButton>
    </template>
    <form v-else-if="stage === 'email'" class="recovery-form" novalidate :aria-busy="busy" @submit.prevent="sendLink">
      <p>Укажи почту аккаунта — отправим ссылку, чтобы задать новый пароль.</p>
      <BaseInput id="recovery-email" v-model="form.email" label="Email" type="email" autocomplete="email" inputmode="email" :disabled="busy" :error="emailError" />
      <p v-if="error" class="recovery-error" role="alert">{{ error }}</p>
      <BaseButton type="submit" :loading="busy" loading-label="Отправляем…" :disabled="cooldown > 0">{{ cooldown ? `Повторить через ${cooldown} с` : 'Отправить ссылку' }}</BaseButton>
    </form>
    <div v-else-if="stage === 'sent'" class="recovery-result" role="status">
      <p>Если аккаунт с почтой <strong>{{ form.email }}</strong> есть, на неё придёт ссылка для восстановления. Ссылка действует 30 минут.</p>
      <p>Проверь папку «Спам», если письмо не появится во входящих.</p>
      <BaseButton :loading="busy" loading-label="Отправляем…" :disabled="cooldown > 0" @click="sendLink">{{ cooldown ? `Повторить через ${cooldown} с` : 'Отправить ещё раз' }}</BaseButton>
      <BaseButton variant="secondary" :disabled="busy" @click="changeEmail">Изменить адрес</BaseButton>
      <p v-if="error" class="recovery-error" role="alert">{{ error }}</p>
    </div>
    <form v-else-if="stage === 'password'" class="recovery-form" novalidate :aria-busy="busy" @submit.prevent="savePassword">
      <p>Задай новый пароль для своей коллекции. После смены потребуется войти заново на всех устройствах.</p>
      <BaseInput id="reset-password" v-model="form.password" label="Новый пароль" type="password" autocomplete="new-password" hint="Минимум 8 символов" :disabled="busy" :error="passwordError" />
      <BaseInput id="reset-confirm" v-model="form.confirm" label="Повтори новый пароль" type="password" autocomplete="new-password" :disabled="busy" :error="confirmationError" />
      <p v-if="error" class="recovery-error" role="alert">{{ error }}</p>
      <BaseButton type="submit" :loading="busy" loading-label="Сохраняем…">Сохранить новый пароль</BaseButton>
    </form>
    <div v-else-if="stage === 'expired'" class="recovery-result">
      <p>Ссылка уже использована или срок её действия истёк. Запроси новую, чтобы восстановить доступ.</p>
      <BaseButton @click="changeEmail">Получить новую ссылку</BaseButton>
    </div>
    <div v-else class="recovery-result" role="status">
      <p>Пароль обновлён. Теперь можно войти с новым паролем.</p>
      <BaseButton @click="emit('back')">Войти</BaseButton>
    </div>
    <button v-if="stage !== 'success'" type="button" class="recovery-back" :disabled="busy" @click="back">Вернуться ко входу</button>
    <ConfirmationModal v-if="confirmLeave" title="Выйти без сохранения?" message="Введённый новый пароль не сохранится." confirm-label="Выйти без сохранения" cancel-label="Остаться" @confirm="resolveLeave(true)" @close="resolveLeave(false)" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import useVuelidate from '@vuelidate/core'
import { email, maxLength, minLength, required, sameAs } from '@vuelidate/validators'
import { requestPasswordReset, checkPasswordReset, resetPassword } from '@/api/auth'
import { ApiError } from '@/api/http'
import { useUnsavedChanges } from '@/shared/composables/useUnsavedChanges'
import BaseInput from '@/shared/ui/form/BaseInput.vue'
import BaseButton from '@/shared/ui/buttons/BaseButton.vue'
import VinylLoader from '@/shared/ui/feedback/VinylLoader.vue'
import ConfirmationModal from '@/shared/ui/modals/ConfirmationModal.vue'

const props = defineProps<{
  token?: string
  initialEmail?: string
}>()
const emit = defineEmits<{
  back: []
}>()
type Stage = 'email' | 'checking' | 'sent' | 'password' | 'expired' | 'success'
const stage = ref<Stage>(props.token ? 'checking' : 'email')
const busy = ref(false)
const attempted = ref(false)
const error = ref('')
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
const form = reactive({ email: props.initialEmail ?? '', password: '', confirm: '' })
const emailV$ = useVuelidate({ email: { required, email, maxLength: maxLength(254) } }, form)
const passwordRules = computed(() => ({ password: { required, minLength: minLength(8), maxLength: maxLength(128) }, confirm: { required, sameAs: sameAs(form.password) } }))
const passwordV$ = useVuelidate(passwordRules, form)
const emailError = computed(() => attempted.value && emailV$.value.email.$invalid ? 'Укажи корректный email' : '')
const passwordError = computed(() => attempted.value && passwordV$.value.password.$invalid ? form.password.length > 128 ? 'Пароль слишком длинный' : 'Минимум 8 символов' : '')
const confirmationError = computed(() => attempted.value && passwordV$.value.confirm.$invalid ? 'Пароли должны совпадать' : '')
const title = computed(() => ({ email: 'Не помнишь пароль?', checking: 'Проверяем ссылку', sent: 'Проверь почту', password: 'Новый пароль', expired: 'Нужна новая ссылка', success: 'Пароль обновлён' })[stage.value])
const { canLeave, confirmLeave, resolveLeave } = useUnsavedChanges(computed(() => stage.value === 'password' && !!(form.password || form.confirm)), busy)

async function checkLink() {
  error.value = ''; busy.value = true
  try { await checkPasswordReset(props.token ?? ''); stage.value = 'password' }
  catch (cause) {
    if (cause instanceof ApiError && cause.status === 410) stage.value = 'expired'
    else error.value = 'Не удалось проверить ссылку. Попробуй снова.'
  } finally { busy.value = false }
}
async function sendLink() {
  if (busy.value || cooldown.value) return
  attempted.value = true; error.value = ''
  if (!await emailV$.value.$validate()) { await nextTick(); document.getElementById('recovery-email')?.focus(); return }
  busy.value = true
  try {
    form.email = form.email.trim()
    await requestPasswordReset(form.email)
    stage.value = 'sent'; attempted.value = false; cooldown.value = 60
    if (timer) clearInterval(timer)
    timer = setInterval(() => { cooldown.value = Math.max(0, cooldown.value - 1); if (!cooldown.value && timer) clearInterval(timer) }, 1000)
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось отправить письмо. Попробуй снова.' }
  finally { busy.value = false }
}
async function savePassword() {
  if (busy.value) return
  attempted.value = true; error.value = ''
  if (!await passwordV$.value.$validate()) { await nextTick(); document.querySelector<HTMLInputElement>('.recovery-form input[aria-invalid="true"]')?.focus(); return }
  busy.value = true
  try {
    await resetPassword(props.token ?? '', form.password)
    form.password = ''; form.confirm = ''; attempted.value = false; stage.value = 'success'
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 410) { form.password = ''; form.confirm = ''; stage.value = 'expired' }
    else error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить пароль. Попробуй снова.'
  } finally { busy.value = false }
}
function changeEmail() { stage.value = 'email'; attempted.value = false; error.value = '' }
async function back() { if (await canLeave()) emit('back') }
onMounted(() => { if (props.token) void checkLink() })
onUnmounted(() => { if (timer) clearInterval(timer) })
defineExpose({ canLeave })
</script>

<style scoped lang="scss" src="@/styles/auth/password-recovery.scss"></style>
