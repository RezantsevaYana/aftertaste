import { createHash } from 'node:crypto';
import { PasswordResetService } from './password-reset.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailerService } from './mailer.service.js';
import { verifyPassword } from './password.js';

function setup() {
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'owner' }), updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn() },
    passwordReset: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    session: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async callback => callback(prisma));
  const mailer = { assertConfigured: vi.fn(), sendPasswordReset: vi.fn().mockResolvedValue(undefined) };
  const service = new PasswordResetService(prisma as unknown as PrismaService, mailer as unknown as MailerService);
  return { prisma, mailer, service };
}

describe('Password recovery', () => {
  it('sends a random one-time token but stores only its hash', async () => {
    const { prisma, mailer, service } = setup();
    await service.request({ email: ' Anna@Example.com ' });
    await vi.waitFor(() => expect(mailer.sendPasswordReset).toHaveBeenCalledOnce());
    const [email, token] = mailer.sendPasswordReset.mock.calls[0]!;
    expect(email).toBe('anna@example.com');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const stored = prisma.passwordReset.create.mock.calls[0]![0].data;
    expect(stored.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.userId).toBe('owner');
  });

  it('returns 404 for unknown accounts without creating a token or sending mail', async () => {
    const first = setup(); first.prisma.user.findUnique.mockResolvedValue(null);
    await expect(first.service.request({ email: 'nobody@example.com' })).rejects.toMatchObject({
      status: 404,
      message: 'Аккаунт с такой почтой не найден. Проверь адрес или зарегистрируйся.',
    });
    expect(first.prisma.passwordReset.create).not.toHaveBeenCalled();
    expect(first.mailer.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('does not resend during cooldown', async () => {
    const second = setup(); second.prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await second.service.request({ email: 'anna@example.com' });
    await vi.waitFor(() => expect(second.prisma.user.updateMany).toHaveBeenCalled());
    expect(second.mailer.sendPasswordReset).not.toHaveBeenCalled();
    expect(second.prisma.passwordReset.create).not.toHaveBeenCalled();
  });

  it('rejects malformed or expired tokens without changing passwords', async () => {
    const { prisma, service } = setup();
    await expect(service.check('broken')).rejects.toThrow();
    prisma.passwordReset.findUnique.mockResolvedValue({ expiresAt: new Date(0) });
    await expect(service.check('a'.repeat(64))).rejects.toThrow();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('consumes the link atomically and revokes every session and remaining reset link', async () => {
    const { prisma, service } = setup();
    prisma.passwordReset.findUnique.mockResolvedValue({ tokenHash: 'digest', userId: 'owner', expiresAt: new Date(Date.now() + 60_000) });
    await service.reset({ token: 'a'.repeat(64), password: 'new password' });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    const updated = prisma.user.update.mock.calls[0]![0];
    expect(updated.where).toEqual({ id: 'owner' });
    expect(await verifyPassword('new password', updated.data.passwordHash)).toBe(true);
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'owner' } });
    expect(prisma.passwordReset.deleteMany).toHaveBeenLastCalledWith({ where: { userId: 'owner' } });
  });

  it('rejects a link consumed by a concurrent request', async () => {
    const { prisma, service } = setup();
    prisma.passwordReset.findUnique.mockResolvedValue({ tokenHash: 'digest', userId: 'owner', expiresAt: new Date(Date.now() + 60_000) });
    prisma.passwordReset.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.reset({ token: 'a'.repeat(64), password: 'new password' })).rejects.toThrow();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
  });
});
