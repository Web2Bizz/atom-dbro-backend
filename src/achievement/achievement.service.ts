import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { achievements, userAchievements, users } from '../database/schema';
import { eq, and, ne } from 'drizzle-orm';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';

@Injectable()
export class AchievementService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async create(createAchievementDto: CreateAchievementDto) {
    // Проверяем уникальность названия
    const [existingAchievement] = await this.db
      .select()
      .from(achievements)
      .where(eq(achievements.title, createAchievementDto.title));
    if (existingAchievement) {
      throw new ConflictException('Достижение с таким названием уже существует');
    }

    const [achievement] = await this.db
      .insert(achievements)
      .values(createAchievementDto)
      .returning();
    return achievement;
  }

  async findAll() {
    return this.db.select().from(achievements);
  }

  async findOne(id: number) {
    const [achievement] = await this.db
      .select()
      .from(achievements)
      .where(eq(achievements.id, id));
    if (!achievement) {
      throw new NotFoundException(`Достижение с ID ${id} не найдено`);
    }
    return achievement;
  }

  async update(id: number, updateAchievementDto: UpdateAchievementDto) {
    // Если обновляется название, проверяем уникальность
    if (updateAchievementDto.title) {
      const [existingAchievement] = await this.db
        .select()
        .from(achievements)
        .where(and(
          eq(achievements.title, updateAchievementDto.title),
          ne(achievements.id, id)
        ));
      if (existingAchievement) {
        throw new ConflictException('Достижение с таким названием уже существует');
      }
    }

    const [achievement] = await this.db
      .update(achievements)
      .set({ ...updateAchievementDto, updatedAt: new Date() })
      .where(eq(achievements.id, id))
      .returning();
    if (!achievement) {
      throw new NotFoundException(`Достижение с ID ${id} не найдено`);
    }
    return achievement;
  }

  async remove(id: number) {
    const [achievement] = await this.db
      .delete(achievements)
      .where(eq(achievements.id, id))
      .returning();
    if (!achievement) {
      throw new NotFoundException(`Достижение с ID ${id} не найдено`);
    }
    return achievement;
  }

  async assignToUser(userId: number, achievementId: number) {
    // Проверяем существование пользователя
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем существование достижения
    const [achievement] = await this.db
      .select()
      .from(achievements)
      .where(eq(achievements.id, achievementId));
    if (!achievement) {
      throw new NotFoundException(`Достижение с ID ${achievementId} не найдено`);
    }

    // Проверяем, не получено ли уже это достижение пользователем
    const [existingUserAchievement] = await this.db
      .select()
      .from(userAchievements)
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievementId),
        ),
      );
    if (existingUserAchievement) {
      throw new ConflictException('Пользователь уже получил это достижение');
    }

    // Присваиваем достижение пользователю
    const [userAchievement] = await this.db
      .insert(userAchievements)
      .values({
        userId,
        achievementId,
      })
      .returning();
    return userAchievement;
  }

  async getUserAchievements(userId: number) {
    // Проверяем существование пользователя
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Получаем все достижения пользователя с информацией о достижении
    return this.db
      .select({
        id: userAchievements.id,
        userId: userAchievements.userId,
        achievementId: userAchievements.achievementId,
        unlockedAt: userAchievements.unlockedAt,
        achievement: {
          id: achievements.id,
          title: achievements.title,
          description: achievements.description,
          icon: achievements.icon,
          rarity: achievements.rarity,
          createdAt: achievements.createdAt,
          updatedAt: achievements.updatedAt,
        },
      })
      .from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId));
  }
}

