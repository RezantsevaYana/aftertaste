import { formatMonth } from '@/shared/lib/date/month'

export function currentDate() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10))
}

export function formatDate(value: string) {
  // В старых записях известен только месяц.
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return formatMonth(value)
  if (!isCalendarDate(value)) return ''
  return new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`))
}
