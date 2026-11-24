import { apiRequest } from '@/api/http'
import type { Person, SocialPerson } from '@/entities/person'
import type { ContentType, Entry } from '@/entities/entry'

export interface PeopleResult {
  users: SocialPerson[]
  nextCursor: string | null
  counts: { friends: number; following: number; requests: number }
}
export interface Work {
  type: ContentType
  title: string
  artist: string | null
  author: string | null
  director: string | null
  genre: string | null
  customCategoryName: string | null
}
export interface Recommendation {
  id: string
  person: Person
  work: Work
  note: string
  createdAt: string
}
export interface PlanResult {
  id: string
  created: boolean
  status: 'done' | 'plan'
  categoryEnabled: boolean
}
export type RemoteEntry = Entry & { reviewHidden: boolean }
export interface PersonCollection {
  person: SocialPerson
  canViewPlans: boolean
  entries: RemoteEntry[]
}
export interface Companion {
  userId: string | null
  name: string
}
const path = (id: string) => encodeURIComponent(id)
export function findPeople(tab = 'search', q = '', cursor?: string) {
  const params = new URLSearchParams({ tab, q, ...(cursor ? { cursor } : {}) })
  return apiRequest<PeopleResult>(`/social/people?${params}`)
}
export async function loadPerson(id: string): Promise<PersonCollection> {
  const data = await apiRequest<PersonCollection>(`/social/people/${path(id)}`)
  // Database nulls in optional bibliographic fields become the same shape as our catalog.
  return { ...data, entries: data.entries.map(entry => Object.fromEntries(Object.entries(entry).filter(([key, value]) => value !== null || ['rating', 'month'].includes(key)))) as RemoteEntry[] }
}
export const requestFriend = (id: string) => apiRequest<void>(`/social/friends/${path(id)}`, { method: 'POST' })
export const acceptFriend = (id: string) => apiRequest<void>(`/social/friends/${path(id)}/accept`, { method: 'POST' })
export const removeFriend = (id: string) => apiRequest<void>(`/social/friends/${path(id)}`, { method: 'DELETE' })
export const setFollowing = (id: string, enabled: boolean) => apiRequest<void>(`/social/following/${path(id)}`, { method: enabled ? 'PUT' : 'DELETE' })
export const copyToPlans = (personId: string, entryId: string) => apiRequest<PlanResult>(`/social/people/${path(personId)}/entries/${path(entryId)}/plan`, { method: 'POST' })
export const loadRecommendations = () => apiRequest<{ incoming: Recommendation[]; sent: Recommendation[] }>('/social/recommendations')
export const sendRecommendation = (entryId: string, recipientId: string, note: string) => apiRequest<{ id: string }>('/social/recommendations', { method: 'POST', body: JSON.stringify({ entryId, recipientId, note }) })
export const acceptRecommendation = (id: string) => apiRequest<PlanResult>(`/social/recommendations/${path(id)}/accept`, { method: 'POST' })
export const dismissRecommendation = (id: string) => apiRequest<void>(`/social/recommendations/${path(id)}`, { method: 'DELETE' })
export const saveCompanions = (entryId: string, companions: Companion[]) => apiRequest<{ companions: Companion[] }>(`/social/entries/${path(entryId)}/companions`, { method: 'PUT', body: JSON.stringify({ companions }) })
