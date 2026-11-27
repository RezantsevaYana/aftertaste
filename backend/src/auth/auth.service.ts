import { BadRequestException, ConflictException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { validateProfile } from './profile.js';
import { validateHandle } from './handle.js';
import { hashPassword, verifyPassword } from './password.js';

export const SESSION_COOKIE = 'aftertaste_session';
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
export type AuthUser = {
  id: string;
  email: string;
  handle: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
};
const userSelect = { handle: true, id: true, email: true, firstName: true, lastName: true, avatar: true } as const;
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash: string;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.dummyHash = await hashPassword(randomBytes(32).toString('hex'));
  }

  private credentials(body: unknown) {
    if (!body || typeof body !== 'object') throw new BadRequestException('Укажи email и пароль');
    const { email, password } = body as Record<string, unknown>;
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== 'string' || password.length < 8 || password.length > 128) {
      throw new BadRequestException('Укажи корректный email и пароль не короче 8 символов');
    }
    return { email: email.trim().toLowerCase(), password };
  }

  async register(body: unknown): Promise<AuthUser> {
    const { email, password } = this.credentials(body);
    const profile = validateProfile(body);
    const handle = validateHandle((body as Record<string, unknown>).handle);
    const passwordHash = await hashPassword(password);
    try {
      return await this.prisma.user.create({ data: { email, passwordHash, handle, ...profile }, select: userSelect });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const field = String(error.meta?.target).includes('handle') ? 'handle' : 'email';
        throw new ConflictException({ field, message: field === 'handle' ? 'Этот ник уже занят. Придумай другой.' : 'Этот email уже зарегистрирован. Войди в аккаунт.' });
      }
      throw error;
    }
  }

  async login(body: unknown): Promise<AuthUser> {
    const { email, password } = this.credentials(body);
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash ?? this.dummyHash);
    if (!user || !valid) throw new UnauthorizedException('Неверный email или пароль');
    return { id: user.id, handle: user.handle, email: user.email, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar };
  }

  async updateProfile(userId: string, body: unknown): Promise<AuthUser> {
    const profile = validateProfile(body);
    const handleValue = (body as Record<string, unknown>).handle;
    const handle = handleValue === undefined ? undefined : validateHandle(handleValue);
    try { return await this.prisma.user.update({ where: { id: userId }, data: { ...profile, ...(handle ? { handle } : {}) }, select: userSelect }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ field: 'handle', message: 'Этот ник уже занят. Придумай другой.' });
      throw error;
    }
  }

  async changePassword(userId: string, currentToken: string | undefined, body: unknown): Promise<void> {
    if (!body || typeof body !== 'object') throw new BadRequestException('Укажи текущий и новый пароль');
    const { currentPassword, newPassword } = body as Record<string, unknown>;
    if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 128 ||
        typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      throw new BadRequestException('Новый пароль должен содержать от 8 до 128 символов');
    }
    if (currentPassword === newPassword) throw new BadRequestException('Новый пароль должен отличаться от текущего');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !await verifyPassword(currentPassword, user.passwordHash)) {
      throw new UnauthorizedException('Текущий пароль неверный');
    }
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction(async (transaction) => {
      // Do not overwrite a password changed by another concurrent request.
      const updated = await transaction.user.updateMany({
        where: { id: userId, passwordHash: user.passwordHash }, data: { passwordHash },
      });
      if (updated.count !== 1) throw new UnauthorizedException('Пароль уже изменился. Введи текущий пароль заново.');
      await transaction.session.deleteMany({
        where: { userId, ...(currentToken ? { tokenHash: { not: tokenHash(currentToken) } } : {}) },
      });
      await transaction.passwordReset.deleteMany({ where: { userId } });
    });
  }

  async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await this.prisma.session.create({ data: { tokenHash: tokenHash(token), userId, expiresAt: new Date(Date.now() + SESSION_MAX_AGE) } });
    return token;
  }

  async getUser(token?: string): Promise<AuthUser> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException('Войди в аккаунт');
    const session = await this.prisma.session.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: { select: userSelect } } });
    if (!session || session.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('Сессия завершилась. Войди снова.');
    return session.user;
  }

  async logout(token?: string): Promise<void> {
    if (token) await this.prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }
}
