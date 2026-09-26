export const contentTypes = [
  { value: 'book', label: 'Книги', singular: 'Книга', icon: '↗' },
  { value: 'film', label: 'Фильмы', singular: 'Фильм', icon: '▷' },
  { value: 'series', label: 'Сериалы', singular: 'Сериал', icon: '▤' },
  { value: 'theatre', label: 'Спектакли', singular: 'Спектакль', icon: '✳' },
] as const
export type ContentType = (typeof contentTypes)[number]['value']
export interface EntryDraft {
  type: ContentType
  title: string
  rating: number
  review: string
  month: string
  photo?: string
}
export interface Entry extends EntryDraft {
  id: string
}
export function formatMonth(month: string) {
  return new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric' })
    .format(new Date(`${month}-01T12:00:00`))
    .replace(' г.', '')
}
export function currentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
