import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { normalizeCategoryName } from '../account/categories.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { categoryKey, normalize, pair, personName, publicUserSelect, readSnapshot, workKey, workSnapshot, type WorkSnapshot } from './social-data.js';

type Transaction = Prisma.TransactionClient;
@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  private async transaction<T>(action: (tx: Transaction) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await this.prisma.$transaction(action, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
      catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code) && attempt < 2) continue;
        throw error;
      }
    }
    throw new ConflictException('Данные изменились. Попробуй ещё раз.');
  }
  private async target(tx: Transaction, userId: string, targetId: string) {
    if (userId === targetId) throw new BadRequestException('Выбери другого человека');
    const target = await tx.user.findUnique({ where: { id: targetId }, select: publicUserSelect });
    if (!target) throw new NotFoundException('Пользователь не найден');
    return target;
  }
  private async areFriends(tx: Transaction, a: string, b: string) {
    return Boolean((await tx.friendship.findUnique({ where: { lowId_highId: pair(a, b) } }))?.accepted);
  }
  async people(userId: string, query: string, tab: string, cursor?: string) {
    if (typeof query !== 'string' || typeof tab !== 'string' || (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 80)) || query.length > 100 || !['search', 'friends', 'following', 'requests'].includes(tab)) throw new BadRequestException('Некорректный поиск');
    const [links, following] = await Promise.all([
      this.prisma.friendship.findMany({ where: { OR: [{ lowId: userId }, { highId: userId }] } }),
      this.prisma.follow.findMany({ where: { followerId: userId } }),
    ]);
    const linkedId = (link: typeof links[number]) => link.lowId === userId ? link.highId : link.lowId;
    const ids = tab === 'friends' ? links.filter(link => link.accepted).map(linkedId) : tab === 'requests' ? links.filter(link => !link.accepted).map(linkedId) : tab === 'following' ? following.map(link => link.followingId) : null;
    const words = query.trim().replace(/^@/, '').split(/\s+/).filter(Boolean);
    const users = await this.prisma.user.findMany({
      where: { id: { not: userId, ...(ids ? { in: ids } : {}) }, AND: words.map(word => ({ OR: [
        { firstName: { contains: word, mode: 'insensitive' } }, { lastName: { contains: word, mode: 'insensitive' } }, { handle: { contains: word, mode: 'insensitive' } },
      ] })) },
      select: publicUserSelect, orderBy: { id: 'asc' }, take: 31, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return {
      users: users.slice(0, 30).map(user => {
        const link = links.find(item => linkedId(item) === user.id);
        return { ...user, friend: Boolean(link?.accepted), request: !link || link.accepted ? null : link.requestedById === userId ? 'outgoing' : 'incoming', following: following.some(item => item.followingId === user.id) };
      }),
      nextCursor: users.length > 30 ? users[29]!.id : null,
      counts: { friends: links.filter(link => link.accepted).length, following: following.length, requests: links.filter(link => !link.accepted).length },
    };
  }
  async friendship(userId: string, targetId: string, action: 'request' | 'accept' | 'remove') {
    await this.transaction(async tx => {
      await this.target(tx, userId, targetId);
      const key = pair(userId, targetId);
      const link = await tx.friendship.findUnique({ where: { lowId_highId: key } });
      if (action === 'request') {
        if (!link) await tx.friendship.create({ data: { ...key, requestedById: userId } });
        // A crossed request remains a request until its recipient explicitly accepts.
        return;
      }
      if (action === 'accept') {
        if (link?.accepted) return;
        if (!link || link.requestedById === userId) throw new BadRequestException('Входящей заявки нет');
        await tx.friendship.update({ where: { lowId_highId: key }, data: { accepted: true } });
        for (const [followerId, followingId] of [[userId, targetId], [targetId, userId]]) {
          await tx.follow.upsert({ where: { followerId_followingId: { followerId: followerId!, followingId: followingId! } }, create: { followerId: followerId!, followingId: followingId! }, update: {} });
        }
      } else if (link) {
        await tx.friendship.delete({ where: { lowId_highId: key } });
        await tx.recommendation.updateMany({ where: { handledAt: null, OR: [{ senderId: userId, recipientId: targetId }, { senderId: targetId, recipientId: userId }] }, data: { handledAt: new Date() } });
      }
    });
  }
  async follow(userId: string, targetId: string, enabled: boolean) {
    await this.transaction(async tx => {
      await this.target(tx, userId, targetId);
      if (enabled) await tx.follow.upsert({ where: { followerId_followingId: { followerId: userId, followingId: targetId } }, create: { followerId: userId, followingId: targetId }, update: {} });
      else await tx.follow.deleteMany({ where: { followerId: userId, followingId: targetId } });
    });
  }

  async profile(userId: string, targetId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId }, select: { ...publicUserSelect, plansVisible: true, categorySettings: true } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    const friend = await this.areFriends(this.prisma, userId, targetId);
    const link = await this.prisma.friendship.findUnique({ where: { lowId_highId: pair(userId, targetId) } });
    const following = Boolean(await this.prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userId, followingId: targetId } } }));
    const canViewPlans = friend && user.plansVisible;
    const entries = await this.prisma.entry.findMany({ where: { userId: targetId, ...(canViewPlans ? {} : { status: 'done' }) }, include: { customCategory: true }, orderBy: { createdAt: 'desc' } });
    const safeEntries = entries.filter(entry => {
      const setting = user.categorySettings.find(item => item.categoryKey === categoryKey(entry));
      return setting?.enabled ?? !['podcast', 'lecture'].includes(entry.type);
    }).map(entry => {
      const setting = user.categorySettings.find(item => item.categoryKey === categoryKey(entry));
      const canRead = entry.status === 'done' && friend && (entry.reviewVisibility ?? setting?.reviewVisibility ?? 'private') === 'friends';
      return {
        id: entry.id, ...workSnapshot(entry), customCategoryId: entry.customCategoryId,
        status: entry.status, rating: entry.rating, month: entry.month, date: entry.date, dateStart: entry.dateStart, plannedDate: entry.plannedDate,
        review: canRead ? entry.review : '', reviewHidden: Boolean(entry.review) && !canRead,
      };
    });
    const { plansVisible: _plans, categorySettings: _settings, ...person } = user;
    return { person: { ...person, friend, following, request: !link || link.accepted ? null : link.requestedById === userId ? 'outgoing' : 'incoming' }, canViewPlans, entries: safeEntries };
  }

  private async copyPlan(tx: Transaction, userId: string, sourceUserId: string, sourceEntryKey: string, snapshot: WorkSnapshot, sourceKind: 'collection' | 'recommendation') {
    const key = workKey(snapshot);
    const owned = await tx.entry.findMany({ where: { userId }, include: { customCategory: true } });
    const existing = owned.find(entry => entry.socialKey === key || workKey(workSnapshot(entry)) === key);
    if (existing) return { id: existing.id, created: false, status: existing.status, categoryEnabled: true };
    let customCategoryId: string | null = null;
    if (snapshot.type === 'custom') {
      const name = snapshot.customCategoryName || 'Своя категория';
      const category = await tx.customCategory.upsert({ where: { userId_normalizedName: { userId, normalizedName: normalizeCategoryName(name) } }, create: { userId, name, normalizedName: normalizeCategoryName(name) }, update: {} });
      customCategoryId = category.id;
    }
    const entry = await tx.entry.create({ data: {
      id: randomUUID(), userId, type: snapshot.type, title: snapshot.title,
      artist: snapshot.artist, author: snapshot.author, director: snapshot.director, genre: snapshot.genre,
      customCategoryId, status: 'plan', rating: null, month: null, review: '',
      socialKey: key, sourceUserId, sourceEntryKey, sourceKind,
    } });
    const category = await tx.categorySetting.findUnique({ where: { userId_categoryKey: { userId, categoryKey: categoryKey(entry) } } });
    return { id: entry.id, created: true, status: entry.status, categoryEnabled: category?.enabled ?? !['podcast', 'lecture'].includes(entry.type) };
  }
  async addPlan(userId: string, ownerId: string, entryId: string) {
    return this.transaction(async tx => {
      const owner = await this.target(tx, userId, ownerId);
      const user = await tx.user.findUniqueOrThrow({ where: { id: owner.id }, select: { plansVisible: true } });
      const entry = await tx.entry.findFirst({ where: { id: entryId, userId: ownerId }, include: { customCategory: true } });
      if (!entry) throw new NotFoundException('Запись не найдена');
      const setting = await tx.categorySetting.findUnique({ where: { userId_categoryKey: { userId: ownerId, categoryKey: categoryKey(entry) } } });
      if (!(setting?.enabled ?? !['podcast', 'lecture'].includes(entry.type)) || entry.status === 'plan' && !(user.plansVisible && await this.areFriends(tx, userId, ownerId))) throw new NotFoundException('Запись не найдена');
      return this.copyPlan(tx, userId, ownerId, entry.id, workSnapshot(entry), 'collection');
    });
  }
  async recommend(userId: string, body: unknown) {
    if (!body || typeof body !== 'object') throw new BadRequestException('Укажи друга и запись');
    const { recipientId, entryId, note = '' } = body as Record<string, unknown>;
    if (typeof recipientId !== 'string' || typeof entryId !== 'string' || typeof note !== 'string' || note.length > 500) throw new BadRequestException('Некорректная рекомендация');
    return this.transaction(async tx => {
      await this.target(tx, userId, recipientId);
      if (!await this.areFriends(tx, userId, recipientId)) throw new ForbiddenException('Рекомендовать можно только друзьям');
      const entry = await tx.entry.findFirst({ where: { id: entryId, userId }, include: { customCategory: true } });
      if (!entry) throw new NotFoundException('Запись не найдена');
      const existing = await tx.recommendation.findUnique({ where: { senderId_recipientId_sourceKey: { senderId: userId, recipientId, sourceKey: entryId } } });
      if (existing) throw new ConflictException('Ты уже отправляла эту рекомендацию этому другу');
      const row = await tx.recommendation.create({ data: { senderId: userId, recipientId, entryId, sourceKey: entryId, snapshot: workSnapshot(entry), note: note.trim() } });
      return { id: row.id };
    });
  }
  async recommendations(userId: string) {
    const [links, rows] = await Promise.all([
      this.prisma.friendship.findMany({ where: { accepted: true, OR: [{ lowId: userId }, { highId: userId }] } }),
      this.prisma.recommendation.findMany({ where: { OR: [{ senderId: userId }, { recipientId: userId, handledAt: null }] }, include: { sender: { select: publicUserSelect }, recipient: { select: publicUserSelect } }, orderBy: { createdAt: 'desc' } }),
    ]);
    const friends = new Set(links.map(link => link.lowId === userId ? link.highId : link.lowId));
    const dto = (row: typeof rows[number]) => ({ id: row.id, work: readSnapshot(row.snapshot), note: row.note, createdAt: row.createdAt, person: row.senderId === userId ? row.recipient : row.sender });
    return { incoming: rows.filter(row => row.recipientId === userId && friends.has(row.senderId)).map(dto), sent: rows.filter(row => row.senderId === userId).map(dto) };
  }
  async handleRecommendation(userId: string, id: string, accept: boolean) {
    return this.transaction(async tx => {
      const row = await tx.recommendation.findFirst({ where: { id, recipientId: userId } });
      if (!row) throw new NotFoundException('Рекомендация не найдена');
      if (row.handledAt) throw new ConflictException('Эта рекомендация уже обработана');
      if (!await this.areFriends(tx, userId, row.senderId)) throw new ForbiddenException('Вы больше не друзья');
      const result = accept ? await this.copyPlan(tx, userId, row.senderId, row.sourceKey, readSnapshot(row.snapshot), 'recommendation') : null;
      await tx.recommendation.update({ where: { id }, data: { handledAt: new Date() } });
      return result;
    });
  }
  async companions(userId: string, entryId: string, body: unknown) {
    if (!body || typeof body !== 'object') throw new BadRequestException('Укажи имена');
    const items = (body as Record<string, unknown>).companions;
    if (!Array.isArray(items) || items.length > 20) throw new BadRequestException('Можно отметить до 20 человек');
    return this.transaction(async tx => {
      if (!await tx.entry.findFirst({ where: { id: entryId, userId }, select: { id: true } })) throw new NotFoundException('Запись не найдена');
      const companions: { userId: string | null; name: string }[] = [];
      const keys = new Set<string>();
      for (const item of items as unknown[]) {
        if (!item || typeof item !== 'object') throw new BadRequestException('Некорректная пометка');
        const value = item as Record<string, unknown>;
        let name: string; let personId: string | null = null;
        if (typeof value.userId === 'string') {
          const person = await this.target(tx, userId, value.userId);
          personId = person.id; name = personName(person);
        } else if ((value.userId === null || value.userId === undefined) && typeof value.name === 'string' && value.name.trim() && value.name.trim().length <= 80) name = value.name.trim();
        else throw new BadRequestException('Имя должно содержать от 1 до 80 символов');
        const key = personId ?? normalize(name);
        if (!keys.has(key)) { keys.add(key); companions.push({ userId: personId, name }); }
      }
      await tx.entry.update({ where: { id: entryId, userId }, data: { companions } });
      return { companions };
    });
  }
}
