import type { Entry } from '@/entities/entry'
import { apiRequest } from '@/api/http'

const request = <T>(path: string, options?: RequestInit) => apiRequest<T>(`/entries${path}`, options)

export function loadEntries(): Promise<Entry[]> {
  return request<Entry[]>('')
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
