import { isCalendarDate } from '@/shared/lib/date'
import { demoEntries } from '@/mocks/demoEntries'
import type { Entry } from '@/entities/entry'
import { contentTypes, theatreGenres, RATING_MIN, RATING_MAX } from '@/entities/entry'

// Здесь позже можно заменить localStorage запросами к API.
const STORAGE_KEY = 'aftertaste.entries.v1'
export function loadEntries(): Entry[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return demoEntries.map((entry) => ({ ...entry }))
  const entries: unknown = JSON.parse(saved)
  if (!Array.isArray(entries) || !entries.every(isEntry)) {
    throw new Error('Некорректные данные каталога')
  }
  return entries
}
function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.review === 'string' &&
    typeof entry.month === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(entry.month) &&
    (entry.date === undefined || (typeof entry.date === 'string' &&
      isCalendarDate(entry.date) && entry.date.slice(0, 7) === entry.month)) &&
    (entry.dateStart === undefined || (
      (entry.type === 'book' || entry.type === 'series') &&
      typeof entry.dateStart === 'string' && isCalendarDate(entry.dateStart) &&
      typeof entry.date === 'string' && entry.dateStart <= entry.date)) &&
    contentTypes.some((type) => type.value === entry.type) &&
    Number.isInteger(entry.rating) &&
    Number(entry.rating) >= RATING_MIN &&
    Number(entry.rating) <= RATING_MAX &&
    (entry.photo === undefined || typeof entry.photo === 'string') &&
    (entry.photos === undefined || (Array.isArray(entry.photos) &&
      entry.photos.every((photo) => typeof photo === 'string' && photo.length > 0))) &&
    (entry.primaryPhotoIndex === undefined || (Array.isArray(entry.photos) &&
      Number.isInteger(entry.primaryPhotoIndex) && Number(entry.primaryPhotoIndex) >= 0 &&
      Number(entry.primaryPhotoIndex) < entry.photos.length)) &&
    (entry.theatreGenre === undefined ||
      theatreGenres.some((genre) => genre.value === entry.theatreGenre)) &&
    (entry.venue === undefined || typeof entry.venue === 'string') &&
    (entry.artist === undefined || typeof entry.artist === 'string') &&
    (entry.type !== 'album' ||
      (typeof entry.artist === 'string' && entry.artist.trim().length > 0))
  )
}
export function saveEntries(entries: Entry[]): void {
  // Ошибку переполнения хранилища обрабатывает экран каталога.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}
