<template>
  <div class="avatar-input" :aria-busy="busy">
    <button type="button" class="avatar-input__preview" :disabled="disabled || busy" :aria-label="model ? 'Заменить аватар' : 'Добавить аватар'" @click="fileInput?.click()">
      <UserAvatar :avatar="model" :first-name="firstName" :last-name="lastName" size="large" />
      <span class="avatar-input__camera"><BaseIcon icon="lucide:camera" /></span>
    </button>
    <div class="avatar-input__controls">
      <label class="avatar-input__label" :class="{ 'avatar-input__label--disabled': disabled || busy }">
        {{ busy ? 'Готовим фото…' : model ? 'Заменить аватар' : 'Добавить аватар' }}
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          :disabled="disabled || busy"
          :aria-invalid="!!error"
          :aria-describedby="error ? errorId : hintId"
          @change="selectAvatar"
        />
      </label>
      <small :id="hintId">Необязательно · JPG, PNG, WebP до 2 МБ</small>
      <BaseButton v-if="model" variant="secondary" size="compact" :disabled="disabled || busy" @click="remove">Удалить аватар</BaseButton>
    </div>
    <p v-if="error" :id="errorId" class="avatar-input__error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, useId } from 'vue'
import BaseIcon from '@/shared/ui/icons/BaseIcon.vue'
import BaseButton from '@/shared/ui/buttons/BaseButton.vue'
import UserAvatar from '@/shared/ui/avatar/UserAvatar.vue'

const props = defineProps<{
  disabled?: boolean
  firstName?: string | null
  lastName?: string | null
}>()
const emit = defineEmits<{
  busy: [value: boolean]
}>()
const model = defineModel<string | null>({ default: null })
const busy = ref(false)
const fileInput = ref<HTMLInputElement>()
const error = ref('')
const errorId = useId()
const hintId = useId()
let disposed = false
onBeforeUnmount(() => { disposed = true })

function remove() {
  model.value = null
  error.value = ''
}

async function selectAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || props.disabled || busy.value) return
  error.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    error.value = 'Выбери JPG, PNG или WebP до 2 МБ.'
    input.value = ''
    return
  }
  busy.value = true
  emit('busy', true)
  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(file)
    const size = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 256, 256)
    const avatar = canvas.toDataURL('image/webp', 0.85)
    if (!disposed) model.value = avatar
  } catch {
    if (!disposed) error.value = 'Не удалось открыть изображение. Выбери другое фото.'
  } finally {
    bitmap?.close()
    busy.value = false
    if (!disposed) emit('busy', false)
    input.value = ''
  }
}
</script>

<style scoped lang="scss" src="@/styles/ui/avatar-input.scss"></style>
