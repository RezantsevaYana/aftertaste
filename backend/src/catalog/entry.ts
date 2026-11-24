export const contentTypes = ['book', 'film', 'series', 'theatre', 'song', 'album', 'exhibition', 'concert', 'podcast', 'lecture', 'custom'] as const;
export const theatreGenres = ['theatre', 'opera', 'ballet', 'musical', 'other'] as const;

export interface Entry {
  id: string;
  type: (typeof contentTypes)[number];
  title: string;
  status?: 'done' | 'plan';
  plannedDate?: string;
  rating: number | null;
  review: string;
  month: string | null;
  date?: string;
  dateStart?: string;
  photo?: string;
  photos?: string[];
  primaryPhotoIndex?: number;
  theatreGenre?: (typeof theatreGenres)[number];
  venue?: string;
  artist?: string;
  author?: string;
  director?: string;
  genre?: string;
  customCategoryId?: string;
  customCategoryName?: string;
  companions?: { userId: string | null; name: string }[];
  source?: { userId: string | null; name: string; kind: string };
  reviewVisibility?: 'inherit' | 'private' | 'friends';
}

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export function validateEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  const planned = entry.status === 'plan';
  const statusValid = entry.status === undefined || entry.status === 'done' || planned;
  const plannedDateValid = entry.plannedDate === undefined ||
    (isDate(entry.plannedDate) && entry.plannedDate >= '1900-01-01' && entry.plannedDate <= '2100-12-31');
  const dateStartValid = entry.dateStart === undefined ||
    ((entry.type === 'book' || entry.type === 'series') && isDate(entry.dateStart) &&
      isDate(entry.date) && entry.dateStart <= entry.date);
  const dateValid = entry.date === undefined ||
    (isDate(entry.date) && entry.date.slice(0, 7) === entry.month);
  const photosValid = entry.photos === undefined ||
    (Array.isArray(entry.photos) && entry.photos.every((photo) =>
      typeof photo === 'string' && photo.length > 0));
  return typeof entry.id === 'string' && entry.id.length > 0 &&
    (entry.type === 'custom'
      ? typeof entry.customCategoryId === 'string' && /^[a-f0-9-]{36}$/i.test(entry.customCategoryId)
      : entry.customCategoryId === undefined) &&
    (entry.reviewVisibility === undefined || entry.reviewVisibility === 'inherit' || entry.reviewVisibility === 'private' || entry.reviewVisibility === 'friends') &&
    contentTypes.includes(entry.type as (typeof contentTypes)[number]) &&
    typeof entry.title === 'string' && entry.title.trim().length > 0 && entry.title.length <= 200 &&
    typeof entry.review === 'string' && entry.review.length <= 10_000 &&
    statusValid && plannedDateValid &&
    (planned
      ? entry.rating === null && entry.month === null && entry.date === undefined && entry.dateStart === undefined
      : typeof entry.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(entry.month) &&
        Number.isInteger(entry.rating) && Number(entry.rating) >= 1 && Number(entry.rating) <= 10) &&
    dateValid && dateStartValid && photosValid &&
    (entry.photo === undefined || typeof entry.photo === 'string') &&
    (entry.primaryPhotoIndex === undefined ||
      (Array.isArray(entry.photos) && Number.isInteger(entry.primaryPhotoIndex) &&
       Number(entry.primaryPhotoIndex) >= 0 && Number(entry.primaryPhotoIndex) < entry.photos.length)) &&
    (entry.theatreGenre === undefined || theatreGenres.includes(entry.theatreGenre as (typeof theatreGenres)[number])) &&
    (entry.venue === undefined || (typeof entry.venue === 'string' && entry.venue.length <= 200)) &&
    (entry.artist === undefined || (typeof entry.artist === 'string' && entry.artist.length <= 200)) &&
    (entry.author === undefined || (entry.type === 'book' && typeof entry.author === 'string' && entry.author.trim().length > 0 && entry.author.length <= 200)) &&
    (entry.director === undefined || (['film', 'series', 'theatre'].includes(String(entry.type)) && typeof entry.director === 'string' && entry.director.trim().length > 0 && entry.director.length <= 200)) &&
    (entry.genre === undefined || (['book', 'film', 'series', 'song', 'album'].includes(String(entry.type)) && typeof entry.genre === 'string' && entry.genre.trim().length > 0 && entry.genre.length <= 200)) &&
    (planned || !['album', 'song'].includes(String(entry.type)) || (typeof entry.artist === 'string' && entry.artist.trim().length > 0));
}
