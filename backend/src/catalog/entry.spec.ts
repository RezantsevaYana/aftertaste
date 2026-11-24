import { describe, expect, it } from 'vitest';
import { validateEntry, type Entry } from './entry.js';

const legacy: Entry = {
  id: 'existing-book', type: 'book', title: 'Книга', rating: 8,
  review: 'Заметка', month: '2026-10',
};
const plan: Entry = {
  ...legacy, status: 'plan', rating: null, month: null,
};

describe('catalog entry states', () => {
  it('keeps legacy impressions without a status or exact day valid', () => {
    expect(validateEntry(legacy)).toBe(true);
  });
  it('accepts a plan without a rating or planned date', () => {
    expect(validateEntry(plan)).toBe(true);
  });
  it('allows an album plan before its artist is known', () => {
    expect(validateEntry({ ...plan, type: 'album' })).toBe(true);
    expect(validateEntry({ ...legacy, type: 'album' })).toBe(false);
  });
  it.each([
    { rating: 0 }, { rating: 7 }, { month: '2026-10' },
    { date: '2026-10-27' }, { dateStart: '2026-10-01' },
    { plannedDate: '2026-02-30' }, { plannedDate: '2026-13-01' },
    { plannedDate: '1899-12-31' }, { status: 'unknown' },
  ])('rejects inconsistent plan fields: %j', (patch) => {
    expect(validateEntry({ ...plan, ...patch })).toBe(false);
  });
  it('allows a real planned date and keeps it after completion', () => {
    expect(validateEntry({ ...plan, plannedDate: '2026-11-07' })).toBe(true);
    expect(validateEntry({ ...legacy, status: 'done', plannedDate: '2026-11-07', date: '2026-10-27', dateStart: '2026-10-01' })).toBe(true);
  });
  it.each([{ rating: null }, { rating: 0 }, { month: null }, { date: '2026-11-01' }])('requires valid impression fields: %j', (patch) => {
    expect(validateEntry({ ...legacy, ...patch })).toBe(false);
  });
  it('preserves photo and primary-photo validation for plans', () => {
    expect(validateEntry({ ...plan, photos: ['photo-one', 'photo-two'], primaryPhotoIndex: 1 })).toBe(true);
    expect(validateEntry({ ...plan, photos: ['photo-one'], primaryPhotoIndex: 1 })).toBe(false);
  });
});

describe('authors and custom genres', () => {
  it('keeps old books without author and genre valid', () => {
    expect(validateEntry(legacy)).toBe(true);
  });
  it('accepts a separate book author and a custom genre for a plan or impression', () => {
    for (const entry of [legacy, plan]) {
      expect(validateEntry({ ...entry, author: 'Урсула Ле Гуин', genre: 'Философская фантастика' })).toBe(true);
    }
  });
  it.each(['book', 'film', 'series', 'album'])('accepts a custom genre for %s', (type) => {
    expect(validateEntry({ ...legacy, type, genre: 'Свой жанр', ...(type === 'album' ? { artist: 'Исполнитель' } : {}) })).toBe(true);
  });
  it.each([
    { author: 42 }, { author: '' }, { author: '   ' }, { author: 'a'.repeat(201) },
    { genre: [] }, { genre: '' }, { genre: '   ' }, { genre: 'a'.repeat(201) },
    { type: 'film', author: 'Автор книги' }, { type: 'theatre', genre: 'Рок' },
    { type: 'exhibition', genre: 'Фантастика' },
  ])('rejects invalid author/genre fields: %j', (patch) => {
    expect(validateEntry({ ...legacy, ...patch })).toBe(false);
  });
});

describe('directors', () => {
  it.each(['film', 'series', 'theatre'])('accepts a director for %s', (type) => {
    expect(validateEntry({ ...legacy, type, director: 'Андрей Тарковский' })).toBe(true);
    expect(validateEntry({ ...plan, type, director: 'Андрей Тарковский' })).toBe(true);
  });
  it.each([
    { type: 'book', director: 'Режиссёр' }, { type: 'album', director: 'Режиссёр' },
    { type: 'exhibition', director: 'Режиссёр' }, { director: 42 },
    { director: '' }, { director: '   ' }, { director: 'a'.repeat(201) },
  ])('rejects invalid director fields: %j', (patch) => {
    expect(validateEntry({ ...legacy, type: 'film', ...patch })).toBe(false);
  });
});

describe('songs and albums', () => {
  it('accepts a song plan without an artist yet', () => {
    expect(validateEntry({ ...plan, type: 'song' })).toBe(true);
  });
  it('requires an artist for a completed song', () => {
    expect(validateEntry({ ...legacy, type: 'song' })).toBe(false);
    expect(validateEntry({ ...legacy, type: 'song', artist: 'Кино', genre: 'Рок' })).toBe(true);
  });
  it('accepts custom musical genres and rejects unrelated metadata', () => {
    expect(validateEntry({ ...plan, type: 'song', genre: 'Свой музыкальный жанр' })).toBe(true);
    expect(validateEntry({ ...plan, type: 'song', author: 'Автор книги' })).toBe(false);
    expect(validateEntry({ ...plan, type: 'song', director: 'Режиссёр' })).toBe(false);
  });
  it('preserves the existing album category', () => {
    expect(validateEntry({ ...legacy, type: 'album', artist: 'Radiohead' })).toBe(true);
  });
});
