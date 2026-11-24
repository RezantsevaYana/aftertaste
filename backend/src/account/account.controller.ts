import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard.js';
import { AccountService } from './account.service.js';

@Controller('api/account')
@UseGuards(AuthGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('settings')
  settings(@Req() request: AuthRequest) { return this.account.settings(request.user.id); }

  @Patch('categories/:key')
  updateCategory(@Req() request: AuthRequest, @Param('key') key: string, @Body() body: unknown) {
    return this.account.updateCategory(request.user.id, key, body);
  }

  @Post('categories')
  createCategory(@Req() request: AuthRequest, @Body() body: unknown) { return this.account.createCategory(request.user.id, body); }

  @Patch('privacy')
  privacy(@Req() request: AuthRequest, @Body() body: unknown) { return this.account.updatePrivacy(request.user.id, body); }
}
