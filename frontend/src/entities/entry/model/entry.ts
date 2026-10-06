export const contentTypes = [
  { value: 'book', label: 'Книги', singular: 'Книга', icon: '↗' },
  { value: 'film', label: 'Фильмы', singular: 'Фильм', icon: '▷' },
  { value: 'series', label: 'Сериалы', singular: 'Сериал', icon: '▤' },
  { value: 'theatre', label: 'Спектакли', singular: 'Спектакль', icon: '✳' },
  { value: 'album', label: 'Музыкальные альбомы', singular: 'Музыкальный альбом', icon: '◎' },
  { value: 'exhibition', label: 'Выставки и музеи', singular: 'Выставка / музей', icon: '▧' },
] as const
export type ContentType = (typeof contentTypes)[number]['value']
export const theatreGenres = [
  { value: 'theatre', label: 'Театр' },
  { value: 'opera', label: 'Опера' },
  { value: 'ballet', label: 'Балет' },
  { value: 'musical', label: 'Мюзикл' },
  { value: 'other', label: 'Другое' },
] as const
export type TheatreGenre = (typeof theatreGenres)[number]['value']
export interface EntryDraft {
  type: ContentType
  title: string
  rating: number
  review: string
  month: string
  photo?: string
  theatreGenre?: TheatreGenre
  venue?: string
  artist?: string
}
export interface Entry extends EntryDraft {
  id: string
}
