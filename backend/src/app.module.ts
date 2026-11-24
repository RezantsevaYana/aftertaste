import { SocialController } from './social/social.controller.js';
import { SocialService } from './social/social.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { AuthGuard } from './auth/auth.guard.js';
import { Module } from '@nestjs/common';
import { CatalogController } from './catalog/catalog.controller.js';
import { CatalogService } from './catalog/catalog.service.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AccountController } from './account/account.controller.js';
import { AccountService } from './account/account.service.js';
import { MailerService } from './auth/mailer.service.js';
import { PasswordResetService } from './auth/password-reset.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, CatalogController, AuthController, AccountController, SocialController],
  providers: [AppService, CatalogService, AuthService, AuthGuard, AccountService, MailerService, PasswordResetService, SocialService],
})
export class AppModule {}
