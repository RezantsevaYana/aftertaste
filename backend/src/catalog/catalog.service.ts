import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, type Entry as DatabaseEntry } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { validateEntry, type Entry } from './entry.js';

@Injectable()
export class CatalogService implements OnModuleInit {
  private readonly legacyFilePath = resolve(
    process.env.DATA_DIR ?? resolve(process.cwd(), 'data'),
    'entries.json',
  );

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.importLegacyFileIfNeeded();
  }

  async findAll(): Promise<Entry[]> {
    const rows = await this.prisma.entry.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((row) => this.toEntry(row));
  }

  async create(entry: Entry): Promise<Entry> {
    try {
      const row = await this.prisma.entry.create({ data: this.toCreateData(entry) });
      return this.toEntry(row);
    } catch (error) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException('Запись с таким идентификатором уже существует');
      }
      throw error;
    }
  }

  async update(id: string, entry: Entry): Promise<Entry> {
    try {
      const row = await this.prisma.entry.update({
        where: { id },
        data: this.toUpdateData(entry),
      });
      return this.toEntry(row);
    } catch (error) {
      if (this.isPrismaError(error, 'P2025')) {
        throw new NotFoundException('Запись не найдена');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.entry.delete({ where: { id } });
    } catch (error) {
      if (this.isPrismaError(error, 'P2025')) {
        throw new NotFoundException('Запись не найдена');
      }
      throw error;
    }
  }

  async import(entries: Entry[]): Promise<Entry[]> {
    const existingCount = await this.prisma.entry.count();
    if (existingCount > 0) return this.findAll();

    const uniqueEntries = [...new Map(entries.map((entry) => [entry.id, entry])).values()];
    if (uniqueEntries.length > 0) {
      await this.prisma.entry.createMany({
        data: uniqueEntries.map((entry) => this.toCreateData(entry)),
      });
    }
    return this.findAll();
  }

  private async importLegacyFileIfNeeded(): Promise<void> {
    if (await this.prisma.entry.count() > 0) return;

    let contents: string;
    try {
      contents = await readFile(this.legacyFilePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }

    const legacyEntries: unknown = JSON.parse(contents);
    if (!Array.isArray(legacyEntries) || !legacyEntries.every(validateEntry)) {
      throw new Error(`Некорректный файл старого каталога: ${this.legacyFilePath}`);
    }

    const uniqueEntries = [...new Map(legacyEntries.map((entry) => [entry.id, entry])).values()];
    if (uniqueEntries.length === 0) return;

    await this.prisma.entry.createMany({
      data: uniqueEntries.map((entry) => this.toCreateData(entry)),
    });
    console.info(`Каталог перенесён в PostgreSQL: ${uniqueEntries.length} записей`);
  }

  private toCreateData(entry: Entry): Prisma.EntryUncheckedCreateInput {
    return {
      id: entry.id,
      type: entry.type,
      title: entry.title,
      rating: entry.rating,
      review: entry.review,
      month: entry.month,
      date: entry.date ?? null,
      dateStart: entry.dateStart ?? null,
      photo: entry.photo ?? null,
      photos: entry.photos ?? [],
      primaryPhotoIndex: entry.primaryPhotoIndex ?? null,
      theatreGenre: entry.theatreGenre ?? null,
      venue: entry.venue ?? null,
      artist: entry.artist ?? null,
    };
  }

  private toUpdateData(entry: Entry): Prisma.EntryUncheckedUpdateInput {
    return {
      type: entry.type,
      title: entry.title,
      rating: entry.rating,
      review: entry.review,
      month: entry.month,
      date: entry.date ?? null,
      dateStart: entry.dateStart ?? null,
      photo: entry.photo ?? null,
      photos: entry.photos ?? [],
      primaryPhotoIndex: entry.primaryPhotoIndex ?? null,
      theatreGenre: entry.theatreGenre ?? null,
      venue: entry.venue ?? null,
      artist: entry.artist ?? null,
    };
  }

  private toEntry(row: DatabaseEntry): Entry {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      rating: row.rating,
      review: row.review,
      month: row.month,
      ...(row.date ? { date: row.date } : {}),
      ...(row.dateStart ? { dateStart: row.dateStart } : {}),
      ...(row.photo ? { photo: row.photo } : {}),
      ...(row.photos.length > 0 ? { photos: row.photos } : {}),
      ...(row.primaryPhotoIndex !== null ? { primaryPhotoIndex: row.primaryPhotoIndex } : {}),
      ...(row.theatreGenre ? { theatreGenre: row.theatreGenre } : {}),
      ...(row.venue ? { venue: row.venue } : {}),
      ...(row.artist ? { artist: row.artist } : {}),
    };
  }

  private isPrismaError(error: unknown, code: string): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
  }
}
