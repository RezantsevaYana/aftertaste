import { BadRequestException, GoneException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashPassword } from './password.js';
import { MailerService } from './mailer.service.js';

export const RESET_MAX_AGE = 30 * 60 * 1000;
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const invalidLink = () => new GoneException('Ссылка недействительна или срок её действия истёк. Запроси новую.');

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  constructor(private readonly prisma: PrismaService, private readonly mailer: MailerService) {}

  async request(body: unknown): Promise<void> {
    if (!body || typeof body !== 'object') throw new BadRequestException('Укажи email');
    const { email } = body as Record<string, unknown>;
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new BadRequestException('Укажи корректный email');
    const address = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: address }, select: { id: true } });
    if (!user) throw new NotFoundException('Аккаунт с такой почтой не найден. Проверь адрес или зарегистрируйся.');
    this.mailer.assertConfigured();
    void this.deliver(user.id, address).catch(() => this.logger.error('Не удалось обработать восстановление пароля'));
  }

  private async deliver(userId: string, email: string) {
    const claimed = await this.prisma.user.updateMany({
      where: { id: userId, OR: [{ passwordResetRequestedAt: null }, { passwordResetRequestedAt: { lt: new Date(Date.now() - 60_000) } }] },
      data: { passwordResetRequestedAt: new Date() },
    });
    if (claimed.count !== 1) return;
    const token = randomBytes(32).toString('hex');
    const tokenHash = digest(token);
    await this.prisma.passwordReset.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await this.prisma.passwordReset.create({ data: { tokenHash, userId, expiresAt: new Date(Date.now() + RESET_MAX_AGE) } });
    try {
      await this.mailer.sendPasswordReset(email, token);
      await this.prisma.passwordReset.deleteMany({ where: { userId, tokenHash: { not: tokenHash } } });
    } catch {
      await this.prisma.passwordReset.deleteMany({ where: { tokenHash } });
      this.logger.error('Не удалось отправить письмо восстановления пароля');
      // Never expose the token in logs/responses.
    }
  }

  async check(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw invalidLink();
    const reset = await this.prisma.passwordReset.findUnique({ where: { tokenHash: digest(token) } });
    if (!reset || reset.expiresAt.getTime() <= Date.now()) throw invalidLink();
    return reset;
  }

  async reset(body: unknown): Promise<void> {
    if (!body || typeof body !== 'object') throw invalidLink();
    const { token, password } = body as Record<string, unknown>;
    if (typeof token !== 'string') throw invalidLink();
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new BadRequestException('Пароль должен содержать от 8 до 128 символов');
    const reset = await this.check(token);
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction(async transaction => {
      // Atomic consumption also rejects two simultaneous submissions of the same link.
      const consumed = await transaction.passwordReset.deleteMany({ where: { tokenHash: reset.tokenHash, expiresAt: { gt: new Date() } } });
      if (consumed.count !== 1) throw invalidLink();
      await transaction.user.update({ where: { id: reset.userId }, data: { passwordHash } });
      await transaction.session.deleteMany({ where: { userId: reset.userId } });
      await transaction.passwordReset.deleteMany({ where: { userId: reset.userId } });
    });
  }
}
