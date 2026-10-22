import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

// Жест начинается только на верхней полоске: содержимое и выпадающие меню прокручиваются независимо.
export function useBottomSheet(
  dialog: Ref<HTMLDialogElement | undefined>,
  close: () => void,
  canClose: () => boolean = () => true,
) {
  const mobile = ref(false)
  const dragging = ref(false)
  const closing = ref(false)
  const offset = ref(0)
  const style = computed(() => ({ '--sheet-offset': `${offset.value}px` }))
  let media: MediaQueryList | undefined
  let pointerId: number | undefined
  let startY = 0
  let startTime = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  function reset() {
    dragging.value = false
    pointerId = undefined
    offset.value = 0
  }
  function updateMedia() {
    mobile.value = media?.matches ?? false
    reset()
  }
  function requestClose() {
    if (closing.value) return
    if (!canClose()) {
      reset()
      return
    }
    if (!mobile.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      close()
      return
    }
    closing.value = true
    dragging.value = false
    offset.value = (dialog.value?.getBoundingClientRect().height ?? window.innerHeight) + 32
    timer = setTimeout(close, 240)
  }
  function onPointerDown(event: PointerEvent) {
    if (!mobile.value || closing.value || !event.isPrimary || event.button !== 0) return
    if ((event.target as HTMLElement).closest('button, input, a, select, textarea')) return
    pointerId = event.pointerId
    startY = event.clientY
    startTime = event.timeStamp
    dragging.value = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== pointerId || !dragging.value) return
    offset.value = Math.max(0, event.clientY - startY)
  }
  function onPointerUp(event: PointerEvent) {
    if (event.pointerId !== pointerId || !dragging.value) return
    const distance = Math.max(0, event.clientY - startY)
    const velocity = distance / Math.max(1, event.timeStamp - startTime)
    const threshold = Math.min(120, (dialog.value?.clientHeight ?? 400) * 0.25)
    pointerId = undefined
    if (distance >= threshold || (distance > 35 && velocity > 0.5)) requestClose()
    else reset()
  }
  function onPointerCancel() {
    if (!closing.value) reset()
  }
  onMounted(() => {
    media = window.matchMedia('(max-width: 480px)')
    updateMedia()
    media.addEventListener('change', updateMedia)
  })
  onBeforeUnmount(() => {
    clearTimeout(timer)
    media?.removeEventListener('change', updateMedia)
  })
  return { dragging, closing, style, requestClose, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
