import type { ObjectDirective } from 'vue'

const cleanups = new WeakMap<HTMLElement, () => void>()

// One indicator follows the active button, including after resize and font loading.
export const vSlidingTabs: ObjectDirective<HTMLElement> = {
  mounted(element) {
    element.classList.add('sliding-tabs')
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const active = element.querySelector<HTMLElement>('button[aria-current="page"]')
        if (!active || !element.getClientRects().length) {
          element.style.setProperty('--tab-width', '0px')
          return
        }
        element.style.setProperty('--tab-left', `${active.offsetLeft}px`)
        element.style.setProperty('--tab-width', `${active.offsetWidth}px`)
        element.classList.add('sliding-tabs--ready')
      })
    }
    const resize = new ResizeObserver(update)
    resize.observe(element)
    const observeButtons = () => element.querySelectorAll('button').forEach(button => resize.observe(button))
    observeButtons()
    const mutations = new MutationObserver(() => { observeButtons(); update() })
    mutations.observe(element, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-current'] })
    update()
    cleanups.set(element, () => { cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect() })
  },
  unmounted(element) {
    cleanups.get(element)?.()
    cleanups.delete(element)
  },
}
