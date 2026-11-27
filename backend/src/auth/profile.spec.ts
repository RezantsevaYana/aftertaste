import { validateProfile, validateAvatar } from './profile.js';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const profile = { firstName: ' Анна-Мария ', lastName: 'О’Коннор' };

describe('Account profile', () => {
  it('trims names, preserves Unicode, and allows registration without an avatar', () => {
    expect(validateProfile(profile)).toEqual({ firstName: 'Анна-Мария', lastName: 'О’Коннор', avatar: null });
  });

  it('requires both names and enforces their length', () => {
    for (const input of [{}, { ...profile, firstName: ' ' }, { ...profile, lastName: '' }, { ...profile, firstName: 'a'.repeat(101) }, { ...profile, firstName: 'a\u0000' }]) {
      expect(() => validateProfile(input)).toThrow();
    }
  });

  it('rejects remote images, SVG, incorrect signatures and oversized avatars', () => {
    for (const value of ['https://example.com/photo.jpg', 'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,Ym9ndXM=', 'a'.repeat(2_800_001)]) {
      expect(() => validateAvatar(value)).toThrow();
    }
    expect(validateAvatar(null)).toBeNull();
    expect(validateAvatar(undefined)).toBeNull();
    expect(validateAvatar('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==')).toContain('data:image/png');
  });

  it('updates only profile fields of the authenticated user', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'owner', ...profile });
    const auth = new AuthService({ user: { update } } as unknown as PrismaService);
    await auth.updateProfile('owner', { ...profile, id: 'someone-else', email: 'hijack@example.com', passwordHash: 'forged' });
    expect(update.mock.calls[0]![0].where).toEqual({ id: 'owner' });
    expect(update.mock.calls[0]![0].data).toEqual({ firstName: 'Анна-Мария', lastName: 'О’Коннор', avatar: null });
    expect(update.mock.calls[0]![0].select).not.toHaveProperty('passwordHash');
  });

  it('accepts an eight-character password and rejects a shorter one during registration', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'user' });
    const auth = new AuthService({ user: { create } } as unknown as PrismaService);
    await expect(auth.register({ ...profile, handle: 'anna', email: 'valid@example.com', password: '1234567' })).rejects.toThrow();
    await auth.register({ ...profile, handle: 'anna', email: 'valid@example.com', password: 'aB123456' });
    expect(create).toHaveBeenCalledOnce();
  });
});
