<template>
  <div class="field field--validated" :class="{ 'field--invalid': error }">
    <span class="field__label">Фото <span class="muted">· необязательно</span></span>
    <div class="field__control">
      <div class="photo-upload" :class="{ 'photo-upload--invalid': error }" :aria-busy="busy">
        <label class="photo-upload__label">
          <span>{{ busy ? 'Читаем фото…' : '＋ Добавить фото' }}</span>
          <small>Можно несколько · JPG, PNG, WebP · до 2 МБ каждое</small>
          <input
            type="file"
            multiple
            :disabled="busy"
            :aria-invalid="!!error"
            :aria-describedby="error ? errorId : undefined"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Добавить фото"
            @change="selectPhotos"
          />
        </label>
        <p v-if="photos.length" class="photo-upload__hint">Выбери главное фото — оно появится в карточке.</p>
        <PhotoGallery v-if="photos.length" :photos="photos">
          <template #controls="{ index }">
            <label class="photo-upload__primary" title="Главное фото для карточки">
              <input
                v-model="primaryIndex"
                type="radio"
                :name="radioName"
                :value="index"
                :disabled="busy"
                :aria-label="`Сделать фото ${index + 1} главным`"
              />
            </label>
            <IconButton
              class="photo-upload__remove"
              icon="lucide:x"
              :disabled="busy"
              :label="`Удалить фото ${index + 1}`"
              @click="removePhoto(index)"
            />
          </template>
        </PhotoGallery>
      </div>
      <small v-if="error" :id="errorId" class="field__error" role="alert">{{ error }}</small>
      <span class="photo-upload__status" role="status">{{ busy ? 'Загрузка фотографий' : '' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, useId } from 'vue'
import PhotoGallery from '@/shared/ui/gallery/PhotoGallery.vue'
import IconButton from '@/shared/ui/buttons/IconButton.vue'
const photos = defineModel<string[]>({ required: true })
const primaryIndex = defineModel<number>('primaryIndex', { required: true })
const error = ref('')
const busy = ref(false)
const errorId = useId()
const radioName = useId()
const emit = defineEmits<{
  busy: [value: boolean]
}>()
let disposed = false
onBeforeUnmount(() => { disposed = true })

function removePhoto(index: number) {
  photos.value = photos.value.filter((_, photoIndex) => photoIndex !== index)
  if (index === primaryIndex.value) primaryIndex.value = 0
  else if (index < primaryIndex.value) primaryIndex.value -= 1
}

function readPhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Не удалось прочитать фото'))
    reader.onabort = () => reject(new Error('Чтение прервано'))
    reader.readAsDataURL(file)
  })
}

async function selectPhotos(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (!files.length || busy.value) return
  error.value = ''
  if (files.some((file) =>
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024,
  )) {
    error.value = 'Каждое фото должно быть JPG, PNG или WebP до 2 МБ.'
    input.value = ''
    return
  }
  busy.value = true
  emit('busy', true)
  try {
    const addedPhotos = await Promise.all(files.map(readPhoto))
    if (!disposed) photos.value = [...new Set([...photos.value, ...addedPhotos])]
  } catch {
    if (!disposed) error.value = 'Не удалось прочитать фото. Попробуй ещё раз.'
  } finally {
    busy.value = false
    if (!disposed) emit('busy', false)
    input.value = ''
  }
}
</script>

<style scoped lang="scss" src="@/styles/ui/photo-input.scss"></style>
