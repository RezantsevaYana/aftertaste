import { AuthService } from './auth.service.js';
import { hashPassword, verifyPassword } from './password.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CatalogService } from '../catalog/catalog.service.js';

const prismaMock = () => ({
  user: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  passwordReset: { deleteMany: vi.fn() },
  session: { create: vi.fn(), deleteMany: vi.fn(), findUnique: vi.fn() },
  entry: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn(), delete: vi.fn() },
});

describe('Authentication and ownership', () => {
  it('changes the password and revokes other sessions in one transaction', async () => {
    const prisma = prismaMock();
    const oldHash = await hashPassword('old password');
    prisma.user.findUnique.mockResolvedValue({ id: 'user-a', passwordHash: oldHash });
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    const transaction = vi.fn(async (callback) => callback(prisma));
    const auth = new AuthService({ ...prisma, $transaction: transaction } as unknown as PrismaService);
    const token = 'a'.repeat(64);
    await auth.changePassword('user-a', token, { currentPassword: 'old password', newPassword: 'new password' });
    expect(transaction).toHaveBeenCalledOnce();
    const update = prisma.user.updateMany.mock.calls[0]![0];
    expect(update.where).toEqual({ id: 'user-a', passwordHash: oldHash });
    expect(await verifyPassword('new password', update.data.passwordHash)).toBe(true);
    expect(await verifyPassword('old password', update.data.passwordHash)).toBe(false);
    const sessions = prisma.session.deleteMany.mock.calls[0]![0].where;
    expect(sessions.userId).toBe('user-a');
    expect(sessions.tokenHash.not).toMatch(/^[a-f0-9]{64}$/);
    expect(sessions.tokenHash.not).not.toBe(token);
    expect(prisma.passwordReset.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-a' } });
  });

  it('rejects invalid or incorrect passwords without changing the database', async () => {
    const prisma = prismaMock();
    prisma.user.findUnique.mockResolvedValue({ passwordHash: await hashPassword('old password') });
    const transaction = vi.fn();
    const auth = new AuthService({ ...prisma, $transaction: transaction } as unknown as PrismaService);
    for (const body of [null, {}, { currentPassword: 'old password', newPassword: 'short' },
      { currentPassword: 'old password', newPassword: 'old password' },
      { currentPassword: 'old password', newPassword: 'x'.repeat(129) },
      { currentPassword: 'wrong password', newPassword: 'new password' }]) {
      await expect(auth.changePassword('user-a', undefined, body)).rejects.toThrow();
    }
    expect(transaction).not.toHaveBeenCalled();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it('does not revoke sessions when a concurrent password change wins', async () => {
    const prisma = prismaMock();
    prisma.user.findUnique.mockResolvedValue({ passwordHash: await hashPassword('old password') });
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    const transaction = vi.fn(async (callback) => callback(prisma));
    const auth = new AuthService({ ...prisma, $transaction: transaction } as unknown as PrismaService);
    await expect(auth.changePassword('user-a', undefined, { currentPassword: 'old password', newPassword: 'new password' })).rejects.toThrow('Пароль уже изменился');
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it('uses a unique salt and verifies passwords', async () => {
    const first = await hashPassword('a secure password');
    const second = await hashPassword('a secure password');
    expect(first).not.toBe(second);
    expect(await verifyPassword('a secure password', first)).toBe(true);
    expect(await verifyPassword('wrong password', first)).toBe(false);
  });

  it('normalizes email and stores a hash, without returning it', async () => {
    const prisma = prismaMock();
    prisma.user.create.mockResolvedValue({ id: 'user-a', email: 'a@example.com' });
    const auth = new AuthService(prisma as unknown as PrismaService);
    expect(await auth.register({ handle: ' Anna.Ivanova ', email: ' A@Example.com ', password: 'long password', firstName: ' Анна ', lastName: 'Иванова' })).toEqual({ id: 'user-a', email: 'a@example.com' });
    const data = prisma.user.create.mock.calls[0]![0].data;
    expect(data.email).toBe('a@example.com');
    expect(data.passwordHash).not.toBe('long password');
    expect(await verifyPassword('long password', data.passwordHash)).toBe(true);
    expect(data.firstName).toBe('Анна');
    expect(data.lastName).toBe('Иванова');
    expect(data.avatar).toBeNull();
    expect(prisma.user.create.mock.calls[0]![0].select).toEqual({ handle: true, id: true, email: true, firstName: true, lastName: true, avatar: true });
  });

  it('rejects malformed registration without accessing the database', async () => {
    const prisma = prismaMock();
    const auth = new AuthService(prisma as unknown as PrismaService);
    for (const body of [null, {}, { email: 'broken', password: 'long password' }, { email: 'a@example.com', password: 'short' }]) {
      await expect(auth.register(body)).rejects.toThrow();
    }
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('returns the same error for missing user and wrong password', async () => {
    const prisma = prismaMock();
    const auth = new AuthService(prisma as unknown as PrismaService);
    await auth.onModuleInit();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(auth.login({ email: 'a@example.com', password: 'wrong password' })).rejects.toThrow('Неверный email или пароль');
    prisma.user.findUnique.mockResolvedValue({ id: 'a', passwordHash: await hashPassword('right password') });
    await expect(auth.login({ email: 'a@example.com', password: 'wrong password' })).rejects.toThrow('Неверный email или пароль');
  });

  it('stores only a hash of a cryptographically random session token', async () => {
    const prisma = prismaMock();
    const auth = new AuthService(prisma as unknown as PrismaService);
    const token = await auth.createSession('user-a');
    const data = prisma.session.create.mock.calls[0]![0].data;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(data.tokenHash).not.toBe(token);
    expect(data.userId).toBe('user-a');
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects missing, invalid and expired sessions', async () => {
    const prisma = prismaMock();
    const auth = new AuthService(prisma as unknown as PrismaService);
    await expect(auth.getUser()).rejects.toThrow();
    await expect(auth.getUser('invalid')).rejects.toThrow();
    prisma.session.findUnique.mockResolvedValue(null);
    await expect(auth.getUser('a'.repeat(64))).rejects.toThrow();
    prisma.session.findUnique.mockResolvedValue({ expiresAt: new Date(0), user: { id: 'a' } });
    await expect(auth.getUser('a'.repeat(64))).rejects.toThrow();
  });

  it('scopes catalog reads, updates and deletion by authenticated owner', async () => {
    const prisma = prismaMock();
    const catalog = new CatalogService(prisma as unknown as PrismaService);
    await catalog.findAll('user-a');
    expect(prisma.entry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a' }, orderBy: { createdAt: 'desc' } }));
    await catalog.remove('someone-elses-entry', 'user-a');
    expect(prisma.entry.delete).toHaveBeenCalledWith({ where: { id: 'someone-elses-entry', userId: 'user-a' } });
    prisma.entry.update.mockRejectedValue(new Error('not found'));
    await expect(catalog.update('entry', { id: 'entry', type: 'book', title: 'Book', review: '', month: '2026-11', rating: 5 }, 'user-b')).rejects.toThrow();
    expect(prisma.entry.update.mock.calls[0]![0].where).toEqual({ id: 'entry', userId: 'user-b' });
    expect(prisma.entry.update.mock.calls[0]![0].data).not.toHaveProperty('userId');
  });
});
