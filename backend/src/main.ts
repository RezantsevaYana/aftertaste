import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Согласовано с client_max_body_size в deploy/nginx.conf.
  app.useBodyParser('json', { limit: '20mb' });
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN?.split(',') ?? true });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
