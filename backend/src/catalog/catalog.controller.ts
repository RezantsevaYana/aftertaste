import { AuthGuard, type AuthRequest } from '../auth/auth.guard.js';
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';
import { validateEntry, type Entry } from './entry.js';

@Controller('api/entries')
@UseGuards(AuthGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  findAll(@Req() request: AuthRequest): Promise<Entry[]> {
    return this.catalogService.findAll(request.user.id);
  }

  @Post()
  create(@Req() request: AuthRequest, @Body() body: unknown): Promise<Entry> {
    if (!validateEntry(body)) throw new BadRequestException('Некорректные данные записи');
    return this.catalogService.create(body, request.user.id);
  }

  @Post('import')
  import(@Req() request: AuthRequest, @Body() body: unknown): Promise<Entry[]> {
    if (!Array.isArray(body) || !body.every(validateEntry)) {
      throw new BadRequestException('Некорректные данные каталога');
    }
    return this.catalogService.import(body, request.user.id);
  }

  @Put(':id')
  update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: unknown): Promise<Entry> {
    if (!validateEntry(body)) throw new BadRequestException('Некорректные данные записи');
    return this.catalogService.update(id, body, request.user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Req() request: AuthRequest, @Param('id') id: string): Promise<void> {
    return this.catalogService.remove(id, request.user.id);
  }
}
