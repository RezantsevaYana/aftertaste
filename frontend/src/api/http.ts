const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message: string, public status: number, public field?: string) {
    super(message)
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Aftertaste-Request': '1', ...options?.headers },
  })
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('aftertaste:session-expired'))
    }
    const details = await response.json().catch(() => undefined) as { message?: string | string[]; field?: string } | undefined
    const message = Array.isArray(details?.message) ? details.message.join(', ') : details?.message
    throw new ApiError(response.status === 413
      ? 'Запись слишком большая. Удали часть фотографий и попробуй снова.'
      : message || `Ошибка сервера (${response.status})`, response.status, details?.field)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
