<template>
  <div class="photo-gallery" aria-label="Фотографии">
    <div v-for="(photo, index) in photos" :key="photo" class="photo-gallery__tile">
      <button
        type="button"
        class="photo-gallery__open"
        :aria-label="`Рассмотреть фото ${index + 1}`"
        @click="openGallery(index)"
      ><img :src="photo" :alt="`${label} — фото ${index + 1}`" loading="lazy" /></button>
      <slot name="controls" :index="index" />
    </div>
  </div>
  <Teleport to="body">
    <dialog ref="galleryDialog" class="photo-gallery-dialog" aria-label="Просмотр фотографий" @cancel.prevent.stop="open = false">
      <LightGallery
        v-if="galleryDialog"
        v-model:open="open"
        v-model:index="activeIndex"
        :container="galleryDialog"
        :slides="slides"
        :plugins="plugins"
        :strings="galleryStrings"
        :license-key="licenseKey"
        :download="false"
        :zoom="{ showZoomInOutIcons: true }"
        @after-open="focusGallery"
        @after-close="closeGallery"
      />
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { LightGallery } from '@lightgallery/vue'
import Zoom from '@lightgallery/vue/plugins/zoom'
import Thumbnail from '@lightgallery/vue/plugins/thumbnail'

const props = withDefaults(defineProps<{
  photos: string[]
  label?: string
}>(), { label: 'Фото записи' })
const galleryDialog = ref<HTMLDialogElement>()
const open = ref(false)
const activeIndex = ref(0)
const plugins = [Zoom, Thumbnail]
const galleryStrings = {
  closeGallery: 'Закрыть фотографии',
  previousSlide: 'Предыдущее фото',
  nextSlide: 'Следующее фото',
  galleryLabel: 'Просмотр фотографий',
  slideAnnouncement: 'Фото {index} из {total}',
  mediaLoadingFailed: 'Не удалось загрузить фото',
  toggleThumbnails: 'Показать миниатюры',
  moreOptions: 'Ещё',
}

const licenseKey = import.meta.env.VITE_LIGHTGALLERY_LICENSE_KEY || '0000-0000-000-0000'
const slides = computed(() => props.photos.map((src, index) => ({
  src,
  thumb: src,
  alt: `${props.label} — фото ${index + 1}`,
})))
let previousFocus: HTMLElement | null = null
async function openGallery(index: number) {
  previousFocus = document.activeElement as HTMLElement | null
  activeIndex.value = index
  // Native dialog поднимает стандартную lightGallery поверх модалки формы.
  galleryDialog.value?.showModal()
  await nextTick()
  open.value = true
}
async function focusGallery() {
  await nextTick()
  galleryDialog.value?.querySelector<HTMLElement>('.lg-close')?.focus()
}
function closeGallery() {
  galleryDialog.value?.close()
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
}
onBeforeUnmount(() => galleryDialog.value?.close())
</script>

<style scoped lang="scss" src="@/styles/ui/photo-gallery.scss"></style>
