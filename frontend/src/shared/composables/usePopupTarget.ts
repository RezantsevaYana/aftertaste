import { onMounted, ref, type Ref } from 'vue'

// В native dialog меню должно оставаться в его верхнем слое.
export function usePopupTarget(root: Ref<HTMLElement | undefined>) {
  const popupTarget = ref('body')
  onMounted(() => {
    const dialog = root.value?.closest('dialog')
    if (dialog?.id) popupTarget.value = `#${dialog.id}`
  })
  return popupTarget
}
