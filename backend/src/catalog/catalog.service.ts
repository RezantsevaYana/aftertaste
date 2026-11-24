import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Entry as DatabaseEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { readCompanions, personName, publicUserSelect, type PublicUser } from '../social/social-data.js';
import { type Entry } from './entry.js';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<Entry[]> {
    const rows = await this.prisma.entry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { customCategory: true, sourceUser: { select: publicUserSelect } } });
    return rows.map((row) => this.toEntry(row));
  }

  async create(entry: Entry, userId: string): Promise<Entry> {
    await this.assertCategory(entry, userId);
    try {
      const row = await this.prisma.entry.create({ data: { ...this.toCreateData(entry), userId }, include: { customCategory: true, sourceUser: { select: publicUserSelect } } });
      return this.toEntry(row);
    } catch (error) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException('Запись с таким идентификатором уже существует');
      }
      throw error;
    }
  }

  async update(id: string, entry: Entry, userId: string): Promise<Entry> {
    await this.assertCategory(entry, userId);
    try {
      const row = await this.prisma.entry.update({
        where: { id, userId },
        data: this.toUpdateData(entry),
        include: { customCategory: true, sourceUser: { select: publicUserSelect } },
      });
      return this.toEntry(row);
    } catch (error) {
      if (this.isPrismaError(error, 'P2025')) {
        throw new NotFoundException('Запись не найдена');
      }
      throw error;
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.entry.delete({ where: { id, userId } });
    } catch (error) {
      if (this.isPrismaError(error, 'P2025')) {
        throw new NotFoundException('Запись не найдена');
      }
      throw error;
    }
  }

  async import(entries: Entry[], userId: string): Promise<Entry[]> {
    for (const entry of entries) await this.assertCategory(entry, userId);
    const existingCount = await this.prisma.entry.count({ where: { userId } });
    if (existingCount > 0) return this.findAll(userId);

    const uniqueEntries = [...new Map(entries.map((entry) => [entry.id, entry])).values()];
    if (uniqueEntries.length > 0) {
      await this.prisma.entry.createMany({
        data: uniqueEntries.map((entry) => ({ ...this.toCreateData(entry), userId })),
      });
    }
    return this.findAll(userId);
  }

  private toCreateData(entry: Entry): Prisma.EntryUncheckedCreateInput {
    return {
      id: entry.id,
      type: entry.type,
      title: entry.title,
      status: entry.status ?? 'done',
      plannedDate: entry.plannedDate ?? null,
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
      author: entry.author ?? null,
      director: entry.director ?? null,
      genre: entry.genre ?? null,
      customCategoryId: entry.type === 'custom' ? entry.customCategoryId ?? null : null,
      reviewVisibility: entry.reviewVisibility === 'friends' || entry.reviewVisibility === 'private' ? entry.reviewVisibility : null,
    };
  }

  private toUpdateData(entry: Entry): Prisma.EntryUncheckedUpdateInput {
    return {
      type: entry.type,
      title: entry.title,
      status: entry.status ?? 'done',
      plannedDate: entry.plannedDate ?? null,
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
      author: entry.author ?? null,
      director: entry.director ?? null,
      genre: entry.genre ?? null,
      customCategoryId: entry.type === 'custom' ? entry.customCategoryId ?? null : null,
      reviewVisibility: entry.reviewVisibility === 'friends' || entry.reviewVisibility === 'private' ? entry.reviewVisibility : null,
    };
  }

  private toEntry(row: DatabaseEntry & { customCategory?: { name: string } | null; sourceUser?: PublicUser | null }): Entry {
    return {
      id: row.id,
      companions: readCompanions(row.companions),
      ...(row.sourceKind ? { source: { userId: row.sourceUserId, name: row.sourceUser ? personName(row.sourceUser) : 'Пользователь удалён', kind: row.sourceKind } } : {}),
      ...(row.customCategoryId ? { customCategoryId: row.customCategoryId, customCategoryName: row.customCategory?.name } : {}),
      reviewVisibility: row.reviewVisibility ?? 'inherit',
      type: row.type,
      title: row.title,
      status: row.status,
      ...(row.plannedDate ? { plannedDate: row.plannedDate } : {}),
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
      ...(row.author ? { author: row.author } : {}),
      ...(row.director ? { director: row.director } : {}),
      ...(row.genre ? { genre: row.genre } : {}),
    };
  }

  private async assertCategory(entry: Entry, userId: string) {
    if (entry.type !== 'custom') return;
    const category = await this.prisma.customCategory.findFirst({ where: { id: entry.customCategoryId, userId } });
    if (!category) throw new BadRequestException('Эта категория не принадлежит твоему аккаунту');
  }

  private isPrismaError(error: unknown, code: string): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
  }
}
