<template>
  <div class="field">
    <span class="field__label"
      >Фото <span class="muted">· необязательно</span></span
    >
    <div class="photo-upload">
      <img v-if="model" :src="model" alt="Выбранное фото" /><label
        class="photo-upload__label"
        ><span>＋ {{ model ? 'Заменить фото' : 'Добавить фото' }}</span
        ><small>JPG, PNG, WebP · до 2 МБ</small
        ><input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Добавить фото"
          @change="selectPhoto" /></label
      ><BaseButton v-if="model" variant="ghost" @click="model = undefined"
        >Убрать</BaseButton
      >
    </div>
    <small v-if="error" class="error-text" role="alert">{{ error }}</small>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from './BaseButton.vue'
const model = defineModel<string>()
const error = ref('')
const emit = defineEmits<{ busy: [value: boolean] }>()
async function selectPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  error.value = ''
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 2 * 1024 * 1024
  ) {
    error.value = 'Выбери JPG, PNG или WebP размером до 2 МБ.'
    input.value = ''
    return
  }
  emit('busy', true)
  try {
    model.value = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  } catch {
    error.value = 'Не удалось прочитать фото. Попробуй другой файл.'
  } finally {
    emit('busy', false)
    input.value = ''
  }
}
</script>

<style scoped lang="scss" src="@/styles/ui/PhotoInput.scss"></style>
