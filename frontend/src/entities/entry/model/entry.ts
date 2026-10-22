// типы контента
export const contentTypes = [
  { value: 'book', label: 'Книги', singular: 'Книга', icon: 'lucide:book-open' },
  { value: 'film', label: 'Фильмы', singular: 'Фильм', icon: 'lucide:film' },
  { value: 'series', label: 'Сериалы', singular: 'Сериал', icon: 'lucide:tv' },
  { value: 'theatre', label: 'Спектакли', singular: 'Спектакль', icon: 'lucide:drama' },
  { value: 'album', label: 'Музыкальные альбомы', singular: 'Музыкальный альбом', icon: 'lucide:disc-3' },
  { value: 'exhibition', label: 'Выставки и музеи', singular: 'Выставка / музей', icon: 'lucide:image' },
] as const

// жанры спектаклей
export const theatreGenres = [
  { value: 'theatre', label: 'Театр' },
  { value: 'opera', label: 'Опера' },
  { value: 'ballet', label: 'Балет' },
  { value: 'musical', label: 'Мюзикл' },
  { value: 'other', label: 'Другое' },
] as const

export type ContentType = (typeof contentTypes)[number]['value']

export type TheatreGenre = (typeof theatreGenres)[number]['value']

export interface EntryDraft {
  type: ContentType
  title: string
  rating: number
  review: string
  month: string
  date?: string
  dateStart?: string
  // Старый формат: одно фото. Новые записи используют photos.
  photo?: string
  photos?: string[]
  primaryPhotoIndex?: number
  theatreGenre?: TheatreGenre
  venue?: string
  artist?: string
}
export interface Entry extends EntryDraft {
  id: string
}
