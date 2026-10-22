import type { Entry } from '@/entities/entry/model/entry'

export function matchesEntryDate(entry: Entry, start: string, end: string): boolean {
  // У старых записей известен только месяц: включаем их при пересечении месяцев.
  if (!entry.date) return entry.month >= start.slice(0, 7) && entry.month <= end.slice(0, 7)
  const entryStart = entry.dateStart ?? entry.date
  return entryStart <= end && entry.date >= start
}

// Месяц без года повторяется ежегодно; остальные ограничения пересекаются.
export function matchesEntryDateFilter(entry: Entry, value: string | string[], year: string): boolean {
  let start = entry.dateStart ?? entry.date ?? `${entry.month}-01`
  let end = entry.date ?? `${entry.month}-31`
  if (year) {
    start = start > `${year}-01-01` ? start : `${year}-01-01`
    end = end < `${year}-12-31` ? end : `${year}-12-31`
  }
  if (Array.isArray(value) || value.length === 10) {
    const from = Array.isArray(value) ? value[0] : value
    const to = Array.isArray(value) ? value[1] : value
    if (from && to) {
      start = start > from ? start : from
      end = end < to ? end : to
    }
  }
  if (start > end) return false
  if (typeof value === 'string' && /^\d{2}$/.test(value)) {
    const startMonth = start.slice(0, 7)
    const endMonth = end.slice(0, 7)
    const firstYear = Number(start.slice(0, 4))
    const candidate = `${firstYear}-${value}`
    if (candidate >= startMonth && candidate <= endMonth) return true
    return `${firstYear + 1}-${value}` <= endMonth
  }
  return true
}

export function getEntryFilterYears(entries: Entry[]): string[] {
  const years = new Set<string>()
  for (const entry of entries) {
    const first = Number((entry.dateStart ?? entry.date ?? entry.month).slice(0, 4))
    const last = Number((entry.date ?? entry.month).slice(0, 4))
    for (let year = first; year <= last; year++) years.add(String(year))
  }
  return [...years].sort((a, b) => Number(b) - Number(a))
}
