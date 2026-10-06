export function formatMonth(month: string) {
  return new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric' })
    .format(new Date(`${month}-01T12:00:00`))
    .replace(' г.', '')
}
export function currentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
