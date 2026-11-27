import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service.js';
import type { Request, Response } from 'express';
import { AuthGuard, sessionToken, type AuthRequest } from './auth.guard.js';
import { AuthService, SESSION_COOKIE, SESSION_MAX_AGE, type AuthUser } from './auth.service.js';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly passwordReset: PasswordResetService) {}

  @Post('password-reset/request')
  @HttpCode(202)
  async requestPasswordReset(@Body() body: unknown) {
    await this.passwordReset.request(body);
    return { message: 'Запрос принят. Мы отправим ссылку для восстановления.' };
  }

  @Post('password-reset/check')
  @HttpCode(200)
  async checkPasswordReset(@Body() body: unknown) {
    const token = body && typeof body === 'object' ? (body as Record<string, unknown>).token : undefined;
    await this.passwordReset.check(typeof token === 'string' ? token : '');
    return { valid: true };
  }

  @Post('password-reset')
  @HttpCode(204)
  async resetPassword(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    await this.passwordReset.reset(body);
    response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/' });
  }

  private async signIn(user: AuthUser, request: Request, response: Response) {
    await this.auth.logout(sessionToken(request));
    const token = await this.auth.createSession(user.id);
    response.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: SESSION_MAX_AGE });
    response.setHeader('Cache-Control', 'no-store');
    return user;
  }

  @Post('register')
  async register(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.signIn(await this.auth.register(body), request, response);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.signIn(await this.auth.login(body), request, response);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return request.user;
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  updateProfile(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.auth.updateProfile(request.user.id, body);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(sessionToken(request));
    response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/' });
  }

  @Post('password')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  changePassword(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.auth.changePassword(request.user.id, sessionToken(request), body);
  }
}
