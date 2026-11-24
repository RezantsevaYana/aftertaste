import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthRequest } from '../auth/auth.guard.js';
import { SocialService } from './social.service.js';

@Controller('api/social')
@UseGuards(AuthGuard)
export class SocialController {
  constructor(private readonly social: SocialService) {}
  @Get('people')
  people(@Req() req: AuthRequest, @Query('q') q = '', @Query('tab') tab = 'search', @Query('cursor') cursor?: string) { return this.social.people(req.user.id, q, tab, cursor); }
  @Get('people/:id')
  profile(@Req() req: AuthRequest, @Param('id') id: string) { return this.social.profile(req.user.id, id); }
  @Post('friends/:id') @HttpCode(204)
  request(@Req() req: AuthRequest, @Param('id') id: string) { return this.social.friendship(req.user.id, id, 'request'); }
  @Post('friends/:id/accept') @HttpCode(204)
  accept(@Req() req: AuthRequest, @Param('id') id: string) { return this.social.friendship(req.user.id, id, 'accept'); }
  @Delete('friends/:id') @HttpCode(204)
  remove(@Req() req: AuthRequest, @Param('id') id: string) { return this.social.friendship(req.user.id, id, 'remove'); }
  @Put('following/:id') @HttpCode(204)
  follow(@Req() req: AuthRequest, @Param('id') id: string) { return this.social.follow(req.user.id, id, true); }
  @Delete('following/:id') @HttpCode(204)
  unfollow(@Req() req: AuthRequest, @Param('id') id: string) { return this.social.follow(req.user.id, id, false); }
  @Post('people/:id/entries/:entryId/plan')
  plan(@Req() req: AuthRequest, @Param('id') id: string, @Param('entryId') entryId: string) { return this.social.addPlan(req.user.id, id, entryId); }
  @Get('recommendations')
  recommendations(@Req() req: AuthRequest) { return this.social.recommendations(req.user.id); }
  @Post('recommendations')
  recommend(@Req() req: AuthRequest, @Body() body: unknown) { return this.social.recommend(req.user.id, body); }
  @Post('recommendations/:id/accept')
  acceptRecommendation(@Req() req: AuthRequest, @Param('id') id: string) { return this.social.handleRecommendation(req.user.id, id, true); }
  @Delete('recommendations/:id') @HttpCode(204)
  async dismiss(@Req() req: AuthRequest, @Param('id') id: string) { await this.social.handleRecommendation(req.user.id, id, false); }
  @Put('entries/:id/companions')
  companions(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.social.companions(req.user.id, id, body); }
}
