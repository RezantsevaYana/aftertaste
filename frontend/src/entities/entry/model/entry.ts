// типы контента
export const contentTypes = [
  { value: 'book', label: 'Книги', singular: 'Книга', icon: 'lucide:book-open' },
  { value: 'film', label: 'Фильмы', singular: 'Фильм', icon: 'lucide:film' },
  { value: 'series', label: 'Сериалы', singular: 'Сериал', icon: 'lucide:tv' },
  { value: 'theatre', label: 'Спектакли', singular: 'Спектакль', icon: 'lucide:drama' },
  { value: 'song', label: 'Треки', singular: 'Трек', icon: 'lucide:music-2' },
  { value: 'album', label: 'Музыкальные альбомы', singular: 'Музыкальный альбом', icon: 'lucide:disc-3' },
  { value: 'exhibition', label: 'Выставки и музеи', singular: 'Выставка / музей', icon: 'lucide:image' },
  { value: 'concert', label: 'Концерты', singular: 'Концерт', icon: 'lucide:ticket' },
  { value: 'podcast', label: 'Подкасты', singular: 'Подкаст', icon: 'lucide:mic' },
  { value: 'lecture', label: 'Лекции', singular: 'Лекция', icon: 'lucide:graduation-cap' },
  { value: 'custom', label: 'Свои категории', singular: 'Своя категория', icon: 'lucide:bookmark' },
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
export type CatalogCategory = Exclude<ContentType, 'song' | 'album' | 'custom'> | 'music' | `custom:${string}`

export const catalogCategories = contentTypes.flatMap<{ value: CatalogCategory; label: string }>(type => {
  if (type.value === 'album' || type.value === 'custom') return []
  if (type.value === 'song') return [{ value: 'music', label: 'Музыка' }]
  return [{ value: type.value, label: type.label }]
})

export const musicFormats = contentTypes.filter(type => type.value === 'song' || type.value === 'album')
  .map(type => ({ value: type.value, label: type.singular }))

export function getCatalogCategory(type: ContentType, customCategoryId?: string): CatalogCategory {
  if (type === 'custom') return `custom:${customCategoryId ?? 'missing'}`
  return isMusicType(type) ? 'music' : type
}

export type TheatreGenre = (typeof theatreGenres)[number]['value']

export interface EntryDraft {
  type: ContentType
  title: string
  status?: 'done' | 'plan'
  plannedDate?: string
  rating: number | null
  review: string
  month: string | null
  date?: string
  dateStart?: string
  // Старый формат: одно фото. Новые записи используют photos.
  photo?: string
  photos?: string[]
  primaryPhotoIndex?: number
  theatreGenre?: TheatreGenre
  venue?: string
  artist?: string
  author?: string
  director?: string
  genre?: string
  customCategoryId?: string
  customCategoryName?: string
  companions?: { userId: string | null; name: string }[]
  source?: { userId: string | null; name: string; kind: string }
  reviewVisibility?: 'inherit' | 'private' | 'friends'
}
export interface Entry extends EntryDraft {
  id: string
}

export type EntryStatus = 'done' | 'plan'

export function isPlannedEntry(entry: EntryDraft): boolean {
  return entry.status === 'plan'
}

export function getCompletionLabel(type: ContentType): string {
  if (type === 'book') return 'Прочитано'
  if (isMusicType(type) || type === 'podcast') return 'Прослушано'
  if (type === 'custom') return 'Завершено'
  if (['theatre', 'exhibition', 'concert', 'lecture'].includes(type)) return 'Посетила'
  return 'Посмотрено'
}

export function isMusicType(type: ContentType): type is 'song' | 'album' {
  return type === 'album' || type === 'song'
}

export function getTypeForCategory(category: CatalogCategory): ContentType {
  if (category === 'music') return 'song'
  return contentTypes.find(type => type.value === category)?.value ?? 'custom'
}

export function getEntryCategoryLabel(entry: EntryDraft): string {
  if (entry.type === 'custom') return entry.customCategoryName ?? 'Своя категория'
  return contentTypes.find(type => type.value === entry.type)?.singular ?? ''
}
