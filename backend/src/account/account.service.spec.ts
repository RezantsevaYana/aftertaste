import { AccountService } from './account.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { validateEntry } from '../catalog/entry.js';

const mock = () => ({
  user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ plansVisible: false }), update: vi.fn() },
  customCategory: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
  categorySetting: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn() },
  entry: { groupBy: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn() },
});

describe('Account categories and privacy', () => {
  it('scopes all settings reads by owner and defaults to private reviews', async () => {
    const prisma = mock();
    prisma.entry.groupBy.mockResolvedValue([{ type: 'book', customCategoryId: null, _count: { _all: 2 } }, { type: 'album', customCategoryId: null, _count: { _all: 1 } }]);
    const account = new AccountService(prisma as unknown as PrismaService);
    const settings = await account.settings('owner');
    expect(prisma.categorySetting.findMany).toHaveBeenCalledWith({ where: { userId: 'owner' } });
    expect(prisma.customCategory.findMany.mock.calls[0]![0].where).toEqual({ userId: 'owner' });
    expect(prisma.entry.groupBy.mock.calls[0]![0].where).toEqual({ userId: 'owner' });
    expect(settings.categories.find(category => category.key === 'book')).toMatchObject({ count: 2, enabled: true, reviewVisibility: 'private' });
    expect(settings.categories.find(category => category.key === 'music')?.count).toBe(1);
    expect(settings.categories.find(category => category.key === 'podcast')?.enabled).toBe(false);
  });

  it('hides a category by preference without deleting or changing entries', async () => {
    const prisma = mock();
    const account = new AccountService(prisma as unknown as PrismaService);
    await account.updateCategory('owner', 'book', { enabled: false, userId: 'someone-else' });
    expect(prisma.categorySetting.upsert.mock.calls[0]![0].where).toEqual({ userId_categoryKey: { userId: 'owner', categoryKey: 'book' } });
    expect(prisma.entry.update).not.toHaveBeenCalled();
  });

  it('rejects foreign custom categories and invalid privacy data', async () => {
    const prisma = mock();
    const account = new AccountService(prisma as unknown as PrismaService);
    await expect(account.updateCategory('owner', 'custom:foreign', { enabled: true })).rejects.toThrow('Категория не найдена');
    await expect(account.updateCategory('owner', 'book', { reviewVisibility: 'public' })).rejects.toThrow();
    await expect(account.updatePrivacy('owner', { plansVisible: 'true' })).rejects.toThrow();
    expect(prisma.categorySetting.upsert).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('validates and normalizes custom names before storing them for the owner', async () => {
    const prisma = mock();
    const account = new AccountService(prisma as unknown as PrismaService);
    for (const name of ['', ' ', 'x'.repeat(61), 'КНИГИ']) await expect(account.createCategory('owner', { name })).rejects.toThrow();
    await account.createCategory('owner', { name: ' Фестивали ' });
    expect(prisma.customCategory.create).toHaveBeenCalledWith({ data: { userId: 'owner', name: 'Фестивали', normalizedName: 'фестивали' } });
  });

  it('requires a custom category id and rejects foreign category assignment before writing an entry', async () => {
    const prisma = mock();
    const catalog = new CatalogService(prisma as unknown as PrismaService);
    const entry = { id: 'entry', type: 'custom' as const, title: 'Festival', status: 'plan' as const, rating: null, month: null, review: '' };
    expect(validateEntry(entry)).toBe(false);
    await expect(catalog.create({ ...entry, customCategoryId: '00000000-0000-0000-0000-000000000000' }, 'owner')).rejects.toThrow('не принадлежит');
    expect(prisma.entry.create).not.toHaveBeenCalled();
  });
});
