import { Prisma } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { validateHandle } from './handle.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const registration = { email: 'anna@example.test', password: 'testpassword123', firstName: 'Анна', lastName: 'Иванова', handle: ' Anna.Ivanova ' };

describe('User-selected handles', () => {
  it('normalizes the handle and stores the selected value during registration', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'owner', handle: 'anna.ivanova' });
    const service = new AuthService({ user: { create } } as unknown as PrismaService);
    await service.register(registration);
    expect(create.mock.calls[0]![0].data.handle).toBe('anna.ivanova');
  });

  it('requires a valid handle before writing a user', async () => {
    const create = vi.fn();
    const service = new AuthService({ user: { create } } as unknown as PrismaService);
    for (const handle of [undefined, '', 'ab', '.anna', 'анна', 'with space', 'x'.repeat(51), 123]) {
      await expect(service.register({ ...registration, handle })).rejects.toThrow('Ник:');
    }
    expect(create).not.toHaveBeenCalled();
    expect(validateHandle('a_b-1.2')).toBe('a_b-1.2');
  });

  it.each(['handle', 'email'])('reports a unique %s conflict even when two registrations race', async (field) => {
    const create = vi.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Duplicate', { code: 'P2002', clientVersion: '6.19.3', meta: { target: [field] } }));
    const service = new AuthService({ user: { create } } as unknown as PrismaService);
    try { await service.register(registration); throw new Error('Expected conflict'); }
    catch (error) {
      expect((error as { getStatus(): number }).getStatus()).toBe(409);
      expect((error as { getResponse(): unknown }).getResponse()).toEqual(expect.objectContaining({ field }));
    }
  });

  it('uses the same normalization and validation when editing a profile', async () => {
    const update = vi.fn().mockResolvedValue({ handle: 'anna.ivanova' });
    const service = new AuthService({ user: { update } } as unknown as PrismaService);
    await service.updateProfile('owner', registration);
    expect(update.mock.calls[0]![0].data.handle).toBe('anna.ivanova');
    await expect(service.updateProfile('owner', { ...registration, handle: 'абв' })).rejects.toThrow('Ник:');
  });
});
