import { isCalendarDate } from '@/shared/lib/date'
import { demoEntries } from '@/mocks/demoEntries'
import type { Entry } from '@/entities/entry'
import { contentTypes, theatreGenres, RATING_MIN, RATING_MAX } from '@/entities/entry'

const STORAGE_KEY = 'aftertaste.entries.v1'
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api/entries${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!response.ok) {
    const details = await response.json().catch(() => undefined) as { message?: string | string[] } | undefined
    const message = Array.isArray(details?.message) ? details.message.join(', ') : details?.message
    throw new Error(message || `Ошибка сервера (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' && typeof entry.title === 'string' &&
    typeof entry.review === 'string' && typeof entry.month === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(entry.month) &&
    (entry.date === undefined || (typeof entry.date === 'string' &&
      isCalendarDate(entry.date) && entry.date.slice(0, 7) === entry.month)) &&
    (entry.dateStart === undefined || ((entry.type === 'book' || entry.type === 'series') &&
      typeof entry.dateStart === 'string' && isCalendarDate(entry.dateStart) &&
      typeof entry.date === 'string' && entry.dateStart <= entry.date)) &&
    contentTypes.some((type) => type.value === entry.type) &&
    Number.isInteger(entry.rating) && Number(entry.rating) >= RATING_MIN &&
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
    (entry.type !== 'album' || (typeof entry.artist === 'string' && entry.artist.trim().length > 0))
  )
}

function getLegacyEntries(): Entry[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return demoEntries.map((entry) => ({ ...entry }))
  const entries: unknown = JSON.parse(saved)
  if (!Array.isArray(entries) || !entries.every(isEntry)) {
    throw new Error('Некорректные данные каталога в этом браузере')
  }
  return entries
}

export async function loadEntries(): Promise<Entry[]> {
  const entries = await request<Entry[]>('')
  if (entries.length > 0) return entries

  // Одноразовый перенос старого каталога из localStorage в серверное хранилище.
  const legacyEntries = getLegacyEntries()
  if (legacyEntries.length === 0) return []
  return request<Entry[]>('/import', {
    method: 'POST',
    body: JSON.stringify(legacyEntries),
  })
}

export function createEntry(entry: Entry): Promise<Entry> {
  return request<Entry>('', { method: 'POST', body: JSON.stringify(entry) })
}

export function updateEntry(entry: Entry): Promise<Entry> {
  return request<Entry>(`/${encodeURIComponent(entry.id)}`, {
    method: 'PUT',
    body: JSON.stringify(entry),
  })
}

export function deleteEntry(id: string): Promise<void> {
  return request<void>(`/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
