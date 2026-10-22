import type { EntryDraft } from '@/entities/entry/model/entry'

export function getEntryPhotos(entry: EntryDraft): string[] {
  return entry.photos ?? (entry.photo ? [entry.photo] : [])
}

export function getPrimaryPhoto(entry: EntryDraft): string | undefined {
  const photos = getEntryPhotos(entry)
  return photos[entry.primaryPhotoIndex ?? 0] ?? photos[0]
}
