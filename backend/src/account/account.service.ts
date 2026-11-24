import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { builtInCategories, isReviewVisibility, normalizeCategoryName } from './categories.js';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async settings(userId: string) {
    const [user, custom, preferences, counts] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plansVisible: true } }),
      this.prisma.customCategory.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.categorySetting.findMany({ where: { userId } }),
      this.prisma.entry.groupBy({ by: ['type', 'customCategoryId'], where: { userId }, _count: { _all: true } }),
    ]);
    const definitions = [
      ...builtInCategories.map(category => ({ ...category, custom: false, customCategoryId: null as string | null })),
      ...custom.map(category => ({ key: `custom:${category.id}`, name: category.name, icon: 'lucide:bookmark', custom: true, customCategoryId: category.id })),
    ];
    return {
      plansVisible: user.plansVisible,
      categories: definitions.map(category => {
        const preference = preferences.find(item => item.categoryKey === category.key);
        const count = counts.filter(item => {
          const key = item.type === 'song' || item.type === 'album' ? 'music' : item.type === 'custom' ? `custom:${item.customCategoryId}` : item.type;
          return key === category.key;
        }).reduce((sum, item) => sum + item._count._all, 0);
        return { ...category, enabled: preference?.enabled ?? !['podcast', 'lecture'].includes(category.key), reviewVisibility: preference?.reviewVisibility ?? 'private', count };
      }),
    };
  }

  private async assertCategory(userId: string, key: string) {
    if (builtInCategories.some(category => category.key === key)) return;
    if (key.startsWith('custom:') && await this.prisma.customCategory.findFirst({ where: { id: key.slice(7), userId } })) return;
    throw new BadRequestException('Категория не найдена');
  }

  async updateCategory(userId: string, categoryKey: string, body: unknown) {
    if (!body || typeof body !== 'object') throw new BadRequestException('Укажи настройки категории');
    const value = body as Record<string, unknown>;
    if (value.enabled !== undefined && typeof value.enabled !== 'boolean' ||
        value.reviewVisibility !== undefined && !isReviewVisibility(value.reviewVisibility) ||
        value.enabled === undefined && value.reviewVisibility === undefined) {
      throw new BadRequestException('Некорректные настройки категории');
    }
    await this.assertCategory(userId, categoryKey);
    const changes = {
      ...(typeof value.enabled === 'boolean' ? { enabled: value.enabled } : {}),
      ...(isReviewVisibility(value.reviewVisibility) ? { reviewVisibility: value.reviewVisibility } : {}),
    };
    await this.prisma.categorySetting.upsert({
      where: { userId_categoryKey: { userId, categoryKey } },
      create: { userId, categoryKey, enabled: !['podcast', 'lecture'].includes(categoryKey), ...changes },
      update: changes,
    });
    return this.settings(userId);
  }

  async createCategory(userId: string, body: unknown) {
    if (!body || typeof body !== 'object') throw new BadRequestException('Укажи название категории');
    const { name } = body as Record<string, unknown>;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 60) throw new BadRequestException('Название должно содержать от 1 до 60 символов');
    const normalizedName = normalizeCategoryName(name);
    if (normalizedName.length > 60 || builtInCategories.some(category => normalizeCategoryName(category.name) === normalizedName)) {
      throw new ConflictException('Категория с таким названием уже есть');
    }
    try {
      await this.prisma.customCategory.create({ data: { userId, name: name.trim(), normalizedName } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Категория с таким названием уже есть');
      throw error;
    }
    return this.settings(userId);
  }

  async updatePrivacy(userId: string, body: unknown) {
    if (!body || typeof body !== 'object' || typeof (body as Record<string, unknown>).plansVisible !== 'boolean') {
      throw new BadRequestException('Укажи видимость планов');
    }
    const { plansVisible } = body as { plansVisible: boolean };
    await this.prisma.user.update({ where: { id: userId }, data: { plansVisible } });
    return this.settings(userId);
  }
}
