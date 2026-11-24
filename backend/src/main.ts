import { requestSecurity, authRateLimit } from './auth/request-security.js';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Согласовано с client_max_body_size в deploy/nginx.conf.
  app.useBodyParser('json', { limit: '20mb' });
  // Enable only behind our reverse proxy, which overwrites X-Forwarded-For.
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
  app.use(requestSecurity);
  app.use(authRateLimit);
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN?.split(',') ?? ['http://localhost:5173', 'http://localhost:8080'], credentials: true });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
