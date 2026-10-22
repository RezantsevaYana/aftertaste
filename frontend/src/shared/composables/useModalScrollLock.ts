import { onBeforeUnmount, onMounted } from 'vue'

let locks = 0
let scrollY = 0
let savedStyles: Pick<CSSStyleDeclaration, 'position' | 'top' | 'width' | 'overflow'>

// Фиксация body блокирует прокрутку страницы и в мобильном Safari.
export function useModalScrollLock() {
  onMounted(() => {
    if (locks++ > 0) return
    const body = document.body
    scrollY = window.scrollY
    savedStyles = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    }
    Object.assign(body.style, { position: 'fixed', top: `-${scrollY}px`, width: '100%', overflow: 'hidden' })
  })
  onBeforeUnmount(() => {
    if (--locks > 0) return
    Object.assign(document.body.style, savedStyles)
    window.scrollTo({ top: scrollY, behavior: 'instant' })
  })
}
