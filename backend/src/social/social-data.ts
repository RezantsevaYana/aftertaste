import { createHash } from 'node:crypto';
import type { Entry as DatabaseEntry, Prisma } from '@prisma/client';

export const publicUserSelect = { id: true, handle: true, firstName: true, lastName: true, avatar: true } as const;
export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
export const personName = (user: Pick<PublicUser, 'firstName' | 'lastName' | 'handle'>) =>
  [user.firstName, user.lastName].filter(Boolean).join(' ') || user.handle;
export const categoryKey = (entry: Pick<DatabaseEntry, 'type' | 'customCategoryId'>) =>
  entry.type === 'song' || entry.type === 'album' ? 'music' : entry.type === 'custom' ? `custom:${entry.customCategoryId}` : entry.type;
export const normalize = (value: string) => value.trim().normalize('NFKC').toLocaleLowerCase('ru').replace(/\s+/g, ' ');
export const pair = (a: string, b: string) => { const [lowId, highId] = [a, b].sort(); return { lowId: lowId!, highId: highId! }; };

// A recommendation contains bibliographic metadata only, never reviews, dates,
// photos, or the owner's private companions.
export function workSnapshot(entry: DatabaseEntry & { customCategory?: { name: string } | null }) {
  return {
    type: entry.type, title: entry.title, artist: entry.artist, author: entry.author,
    director: entry.director, genre: entry.genre,
    customCategoryName: entry.type === 'custom' ? entry.customCategory?.name ?? 'Своя категория' : null,
  };
}
export type WorkSnapshot = ReturnType<typeof workSnapshot>;
export function workKey(work: Pick<WorkSnapshot, 'type' | 'title' | 'artist' | 'author' | 'director'> & { customCategoryName?: string | null }) {
  return createHash('sha256').update(JSON.stringify([
    work.type, normalize(work.title), normalize(work.author ?? work.artist ?? work.director ?? ''),
    work.type === 'custom' ? normalize(work.customCategoryName ?? '') : '',
  ])).digest('hex');
}
export function readSnapshot(value: Prisma.JsonValue): WorkSnapshot {
  // This JSON is written exclusively by workSnapshot, not accepted from API bodies.
  return value as unknown as WorkSnapshot;
}
export interface Companion { userId: string | null; name: string }
export function readCompanions(value: unknown): Companion[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Companion => Boolean(item && typeof item === 'object' &&
    'name' in item && typeof item.name === 'string' && 'userId' in item && (item.userId === null || typeof item.userId === 'string')));
}
