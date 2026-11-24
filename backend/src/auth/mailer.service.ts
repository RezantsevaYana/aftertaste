import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  assertConfigured() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) throw new ServiceUnavailableException('Отправка писем пока недоступна. Попробуй позже.');
  }

  async sendPasswordReset(email: string, token: string) {
    this.assertConfigured();
    const origin = process.env.PUBLIC_APP_URL ?? process.env.FRONTEND_ORIGIN?.split(',')[0] ?? 'http://localhost:8080';
    const url = new URL('/', origin);
    url.hash = new URLSearchParams({ resetToken: token }).toString();
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
      ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}),
      connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
      disableFileAccess: true, disableUrlAccess: true,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Восстановление пароля в Aftertaste',
      text: `Чтобы задать новый пароль, открой ссылку: ${url.href}\n\nСсылка действует 30 минут и используется один раз. Если ты не запрашивала смену пароля, проигнорируй письмо.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:32px auto;color:#28282b;line-height:1.6"><h1 style="font-size:24px">Новый пароль для Aftertaste</h1><p>Чтобы вернуться в свою коллекцию, задай новый пароль.</p><p><a href="${url.href}" style="display:inline-block;background:#4f1718;color:white;padding:12px 20px;border-radius:9px;text-decoration:none">Задать новый пароль</a></p><p>Ссылка действует 30 минут и используется один раз.</p><p>Если ты не запрашивала смену пароля, просто проигнорируй это письмо.</p></div>`,
    });
  }
}
