import { apiRequest } from '@/api/http'
import type { CatalogCategory } from '@/entities/entry'

export type ReviewVisibility = 'private' | 'friends'
export interface AccountCategory {
  key: CatalogCategory
  name: string
  icon: string
  custom: boolean
  customCategoryId: string | null
  enabled: boolean
  reviewVisibility: ReviewVisibility
  count: number
}
export interface AccountSettings {
  plansVisible: boolean
  categories: AccountCategory[]
}
export const loadSettings = () => apiRequest<AccountSettings>('/account/settings')
export const updateCategory = (key: CatalogCategory, changes: { enabled?: boolean; reviewVisibility?: ReviewVisibility }) =>
  apiRequest<AccountSettings>(`/account/categories/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify(changes) })
export const createCategory = (name: string) =>
  apiRequest<AccountSettings>('/account/categories', { method: 'POST', body: JSON.stringify({ name }) })
export const updatePrivacy = (plansVisible: boolean) =>
  apiRequest<AccountSettings>('/account/privacy', { method: 'PATCH', body: JSON.stringify({ plansVisible }) })
