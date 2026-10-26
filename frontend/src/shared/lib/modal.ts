// Дожидаемся ухода окна перед сменой состояния страницы.
export function dismissModal(dialog: HTMLDialogElement | null): Promise<void> {
  if (!dialog?.open) return Promise.resolve()
  return new Promise((resolve) => {
    dialog.dispatchEvent(new CustomEvent('aftertaste:close-modal', { detail: resolve }))
  })
}
