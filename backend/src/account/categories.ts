export const builtInCategories = [
  { key: 'book', name: 'Книги', icon: 'lucide:book-open' },
  { key: 'film', name: 'Фильмы', icon: 'lucide:film' },
  { key: 'series', name: 'Сериалы', icon: 'lucide:tv' },
  { key: 'theatre', name: 'Спектакли', icon: 'lucide:drama' },
  { key: 'music', name: 'Музыка', icon: 'lucide:disc-3' },
  { key: 'exhibition', name: 'Выставки и музеи', icon: 'lucide:image' },
  { key: 'concert', name: 'Концерты', icon: 'lucide:ticket' },
  { key: 'podcast', name: 'Подкасты', icon: 'lucide:mic' },
  { key: 'lecture', name: 'Лекции', icon: 'lucide:graduation-cap' },
] as const;

export const isReviewVisibility = (value: unknown): value is 'private' | 'friends' =>
  value === 'private' || value === 'friends';
export const normalizeCategoryName = (name: string) => name.normalize('NFKC').trim().toLocaleLowerCase('ru');
