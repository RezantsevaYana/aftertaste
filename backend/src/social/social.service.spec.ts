import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { SocialService } from './social.service.js';
import { readCompanions, workKey, workSnapshot } from './social-data.js';

function fixture(friend = false) {
  const user = { id: 'owner', handle: 'owner', firstName: 'Маша', lastName: 'Орлова', avatar: null, plansVisible: true, categorySettings: [{ categoryKey: 'book', enabled: true, reviewVisibility: 'friends' }] };
  const entries = [
    { id: 'one', userId: 'owner', type: 'book', title: 'Книга', status: 'done', rating: 9, review: 'Друзьям', reviewVisibility: null, month: '2026-11', date: '2026-11-01', customCategoryId: null, companions: [{ name: 'Личная пометка' }], photos: ['PRIVATE_PHOTO'] },
    { id: 'two', userId: 'owner', type: 'book', title: 'Другая книга', status: 'done', rating: 8, review: 'Только мне', reviewVisibility: 'private', month: '2026-11', date: '2026-11-02', customCategoryId: null },
  ];
  const db = {
    user: { findUnique: vi.fn().mockResolvedValue(user) },
    friendship: { findUnique: vi.fn().mockResolvedValue(friend ? { accepted: true } : null) },
    follow: { findUnique: vi.fn().mockResolvedValue({ followerId: 'viewer' }) },
    entry: { findMany: vi.fn().mockResolvedValue(entries), findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(async (action: (tx: unknown) => Promise<unknown>) => action(db));
  return { db, service: new SocialService(db as unknown as PrismaService) };
}
describe('Social privacy boundaries', () => {
  it('a subscription never reveals friends-only reviews, plans, private names or photos', async () => {
    const { service, db } = fixture();
    const result = await service.profile('viewer', 'owner');
    expect(result.person.following).toBe(true);
    expect(result.canViewPlans).toBe(false);
    expect(db.entry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'owner', status: 'done' } }));
    expect(result.entries.map(entry => entry.review)).toEqual(['', '']);
    expect(result.entries.map(entry => entry.rating)).toEqual([9, 8]);
    expect(JSON.stringify(result)).not.toContain('Личная пометка');
    expect(JSON.stringify(result)).not.toContain('PRIVATE_PHOTO');
    expect(result.person).not.toHaveProperty('email');
  });
  it('friendship enables category reviews but preserves a private entry exception', async () => {
    const { service } = fixture(true);
    const result = await service.profile('viewer', 'owner');
    expect(result.canViewPlans).toBe(true);
    expect(result.entries[0]?.review).toBe('Друзьям');
    expect(result.entries[1]?.review).toBe('');
    expect(result.entries[1]?.reviewHidden).toBe(true);
  });
  it('only confirmed friends may send recommendations', async () => {
    const { service, db } = fixture();
    await expect(service.recommend('viewer', { recipientId: 'owner', entryId: 'one', note: '' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.entry.findFirst).not.toHaveBeenCalled();
  });
  it('companions cannot be attached to an entry owned by someone else', async () => {
    const { service, db } = fixture();
    await expect(service.companions('viewer', 'foreign-entry', { companions: [{ userId: null, name: 'Мама' }] })).rejects.toBeInstanceOf(NotFoundException);
    expect(db.entry.update).not.toHaveBeenCalled();
  });
});
describe('Safe recommendation metadata', () => {
  it('snapshots contain only bibliographic data, including when a plan has a private note', () => {
    const entry = { type: 'book', title: 'Книга', author: 'Автор', artist: null, director: null, genre: null, review: 'PRIVATE_REVIEW', date: '2026-11-01', plannedDate: '2026-12-01', companions: [{ name: 'PRIVATE_NAME' }], photos: ['PRIVATE_PHOTO'] };
    const snapshot = workSnapshot(entry as Parameters<typeof workSnapshot>[0]);
    expect(snapshot.title).toBe('Книга');
    for (const key of ['review', 'date', 'plannedDate', 'companions', 'photos']) expect(snapshot).not.toHaveProperty(key);
  });
  it('deduplicates the same work across people but distinguishes its creator', () => {
    const book = { type: 'book', title: ' КНИГА ', author: 'Автор', artist: null, director: null } as const;
    expect(workKey(book)).toBe(workKey({ ...book, title: 'книга', author: 'автор' }));
    expect(workKey(book)).not.toBe(workKey({ ...book, author: 'Другой автор' }));
  });
  it('ignores malformed legacy companion data', () => {
    expect(readCompanions(null)).toEqual([]);
    expect(readCompanions([{ userId: null, name: 'Мама' }, { name: 3 }, 'broken'])).toEqual([{ userId: null, name: 'Мама' }]);
  });
});
