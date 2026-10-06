import { demoEntries } from '@/mocks/demoEntries'
import type { Entry } from '@/entities/entry'
import { contentTypes, theatreGenres } from '@/entities/entry'

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
    contentTypes.some((type) => type.value === entry.type) &&
    Number.isInteger(entry.rating) &&
    Number(entry.rating) >= 1 &&
    Number(entry.rating) <= 10 &&
    (entry.photo === undefined || typeof entry.photo === 'string') &&
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
