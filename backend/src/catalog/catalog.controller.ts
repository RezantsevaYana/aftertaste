import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';
import { validateEntry, type Entry } from './entry.js';

@Controller('api/entries')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  findAll(): Promise<Entry[]> {
    return this.catalogService.findAll();
  }

  @Post()
  create(@Body() body: unknown): Promise<Entry> {
    if (!validateEntry(body)) throw new BadRequestException('Некорректные данные записи');
    return this.catalogService.create(body);
  }

  @Post('import')
  import(@Body() body: unknown): Promise<Entry[]> {
    if (!Array.isArray(body) || !body.every(validateEntry)) {
      throw new BadRequestException('Некорректные данные каталога');
    }
    return this.catalogService.import(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: unknown): Promise<Entry> {
    if (!validateEntry(body)) throw new BadRequestException('Некорректные данные записи');
    return this.catalogService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.catalogService.remove(id);
  }
}
