import type { ContentType, Entry } from '@/entities/entry/model/entry'

const screenGenres = ['Драма', 'Комедия', 'Триллер', 'Детектив', 'Фантастика', 'Фэнтези', 'Ужасы', 'Мелодрама', 'Боевик', 'Приключения', 'Документальный', 'Анимация']
const musicGenres = ['Рок', 'Поп', 'Инди', 'Альтернатива', 'Электроника', 'Хип-хоп', 'Джаз', 'Блюз', 'Соул', 'R&B', 'Фолк', 'Классика', 'Метал', 'Панк', 'Эмбиент']
const genrePresets: Partial<Record<ContentType, readonly string[]>> = {
  book: ['Роман', 'Повесть', 'Рассказ', 'Фантастика', 'Фэнтези', 'Детектив', 'Триллер', 'Нон-фикшн', 'Биография', 'Поэзия', 'Комикс', 'Детская литература'],
  film: screenGenres,
  series: screenGenres,
  song: musicGenres,
  album: musicGenres,
}

export function supportsGenre(type: ContentType): boolean {
  return type in genrePresets
}

export function getGenreOptions(type: ContentType, savedGenres: readonly string[] = []) {
  const seen = new Set<string>()
  return [...(genrePresets[type] ?? []), ...savedGenres].flatMap(value => {
    const genre = value.trim()
    const key = genre.toLocaleLowerCase('ru')
    if (!genre || seen.has(key)) return []
    seen.add(key)
    return [{ value: genre, label: genre }]
  })
}

export function getSavedGenres(entries: Entry[]): Partial<Record<ContentType, string[]>> {
  const result: Partial<Record<ContentType, string[]>> = {}
  for (const entry of entries) {
    if (!entry.genre || !supportsGenre(entry.type)) continue
    const values = result[entry.type] ?? []
    values.push(entry.genre)
    result[entry.type] = values
  }
  return result
}
