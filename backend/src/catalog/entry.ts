export const contentTypes = ['book', 'film', 'series', 'theatre', 'album', 'exhibition'] as const;
export const theatreGenres = ['theatre', 'opera', 'ballet', 'musical', 'other'] as const;

export interface Entry {
  id: string;
  type: (typeof contentTypes)[number];
  title: string;
  rating: number;
  review: string;
  month: string;
  date?: string;
  dateStart?: string;
  photo?: string;
  photos?: string[];
  primaryPhotoIndex?: number;
  theatreGenre?: (typeof theatreGenres)[number];
  venue?: string;
  artist?: string;
}

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export function validateEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  const dateStartValid = entry.dateStart === undefined ||
    ((entry.type === 'book' || entry.type === 'series') && isDate(entry.dateStart) &&
      isDate(entry.date) && entry.dateStart <= entry.date);
  const dateValid = entry.date === undefined ||
    (isDate(entry.date) && entry.date.slice(0, 7) === entry.month);
  const photosValid = entry.photos === undefined ||
    (Array.isArray(entry.photos) && entry.photos.every((photo) =>
      typeof photo === 'string' && photo.length > 0));
  return typeof entry.id === 'string' && entry.id.length > 0 &&
    contentTypes.includes(entry.type as (typeof contentTypes)[number]) &&
    typeof entry.title === 'string' && entry.title.trim().length > 0 && entry.title.length <= 200 &&
    typeof entry.review === 'string' && entry.review.length <= 10_000 &&
    typeof entry.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(entry.month) &&
    Number.isInteger(entry.rating) && Number(entry.rating) >= 1 && Number(entry.rating) <= 10 &&
    dateValid && dateStartValid && photosValid &&
    (entry.photo === undefined || typeof entry.photo === 'string') &&
    (entry.primaryPhotoIndex === undefined ||
      (Array.isArray(entry.photos) && Number.isInteger(entry.primaryPhotoIndex) &&
       Number(entry.primaryPhotoIndex) >= 0 && Number(entry.primaryPhotoIndex) < entry.photos.length)) &&
    (entry.theatreGenre === undefined || theatreGenres.includes(entry.theatreGenre as (typeof theatreGenres)[number])) &&
    (entry.venue === undefined || (typeof entry.venue === 'string' && entry.venue.length <= 200)) &&
    (entry.artist === undefined || (typeof entry.artist === 'string' && entry.artist.length <= 200)) &&
    (entry.type !== 'album' || (typeof entry.artist === 'string' && entry.artist.trim().length > 0));
}
