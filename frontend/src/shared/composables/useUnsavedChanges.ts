import { onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue'

// The caller supplies its own confirmation dialog and text.
export function useUnsavedChanges(dirty: ComputedRef<boolean>, busy: Ref<boolean> | ComputedRef<boolean>) {
  const confirmLeave = ref(false)
  let pending: Promise<boolean> | undefined
  let resolver: ((value: boolean) => void) | undefined

  function canLeave(): Promise<boolean> {
    if (busy.value) return Promise.resolve(false)
    if (!dirty.value) return Promise.resolve(true)
    if (pending) return pending
    confirmLeave.value = true
    pending = new Promise(resolve => { resolver = resolve })
    return pending
  }

  function resolveLeave(value: boolean) {
    confirmLeave.value = false
    resolver?.(value)
    resolver = undefined
    pending = undefined
  }

  function beforeUnload(event: BeforeUnloadEvent) {
    if (dirty.value || busy.value) { event.preventDefault(); event.returnValue = '' }
  }

  onMounted(() => window.addEventListener('beforeunload', beforeUnload))
  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', beforeUnload)
    resolver?.(false)
  })

  return { canLeave, confirmLeave, resolveLeave }
}
