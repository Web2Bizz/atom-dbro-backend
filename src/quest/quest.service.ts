import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { quests, userQuests, users, achievements, userAchievements } from '../database/schema';
import { eq, and, ne } from 'drizzle-orm';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';

@Injectable()
export class QuestService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  async create(createQuestDto: CreateQuestDto, userId: number) {
    // Проверяем уровень пользователя (требуется минимум 5 уровень)
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }
    if (user.level < 5) {
      throw new ForbiddenException('Для создания квеста требуется уровень 5 или выше');
    }

    // Создаем достижение с автоматической установкой rarity = 'private'
    // questId будет установлен после создания квеста
    const achievementResult = await this.db
      .insert(achievements)
      .values({
        title: createQuestDto.achievement.title,
        description: createQuestDto.achievement.description,
        icon: createQuestDto.achievement.icon,
        rarity: 'private', // Всегда 'private' для достижений, создаваемых с квестами
      })
      .returning();
    const achievement = Array.isArray(achievementResult) ? achievementResult[0] : achievementResult;
    if (!achievement) {
      throw new Error('Не удалось создать достижение');
    }

    // Создаем квест с привязкой к достижению и владельцем
    const questResult = await this.db
      .insert(quests)
      .values({
        title: createQuestDto.title,
        description: createQuestDto.description,
        status: createQuestDto.status || 'active',
        experienceReward: createQuestDto.experienceReward || 0,
        achievementId: achievement.id,
        ownerId: userId,
      })
      .returning();
    const quest = Array.isArray(questResult) ? questResult[0] : questResult;
    if (!quest) {
      throw new Error('Не удалось создать квест');
    }

    // Обновляем достижение с questId (так как rarity = 'private')
    await this.db
      .update(achievements)
      .set({ questId: quest.id })
      .where(eq(achievements.id, achievement.id));

    // Возвращаем квест с информацией о достижении
    const [questWithAchievement] = await this.db
      .select({
        id: quests.id,
        title: quests.title,
        description: quests.description,
        status: quests.status,
        experienceReward: quests.experienceReward,
        achievementId: quests.achievementId,
        ownerId: quests.ownerId,
        createdAt: quests.createdAt,
        updatedAt: quests.updatedAt,
        achievement: {
          id: achievements.id,
          title: achievements.title,
          description: achievements.description,
          icon: achievements.icon,
          rarity: achievements.rarity,
          questId: achievements.questId,
        },
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(quests)
      .innerJoin(achievements, eq(quests.achievementId, achievements.id))
      .innerJoin(users, eq(quests.ownerId, users.id))
      .where(eq(quests.id, quest.id));

    return questWithAchievement;
  }

  async findAll() {
    return this.db
      .select({
        id: quests.id,
        title: quests.title,
        description: quests.description,
        status: quests.status,
        experienceReward: quests.experienceReward,
        achievementId: quests.achievementId,
        ownerId: quests.ownerId,
        createdAt: quests.createdAt,
        updatedAt: quests.updatedAt,
        achievement: {
          id: achievements.id,
          title: achievements.title,
          description: achievements.description,
          icon: achievements.icon,
          rarity: achievements.rarity,
          questId: achievements.questId,
        },
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(quests)
      .innerJoin(achievements, eq(quests.achievementId, achievements.id))
      .innerJoin(users, eq(quests.ownerId, users.id));
  }

  async findByStatus(status?: 'active' | 'archived' | 'completed') {
    const baseQuery = this.db
      .select({
        id: quests.id,
        title: quests.title,
        description: quests.description,
        status: quests.status,
        experienceReward: quests.experienceReward,
        achievementId: quests.achievementId,
        ownerId: quests.ownerId,
        createdAt: quests.createdAt,
        updatedAt: quests.updatedAt,
        achievement: {
          id: achievements.id,
          title: achievements.title,
          description: achievements.description,
          icon: achievements.icon,
          rarity: achievements.rarity,
          questId: achievements.questId,
        },
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(quests)
      .innerJoin(achievements, eq(quests.achievementId, achievements.id))
      .innerJoin(users, eq(quests.ownerId, users.id));
    
    if (status) {
      return baseQuery.where(eq(quests.status, status));
    }
    return baseQuery;
  }

  async findOne(id: number) {
    const [quest] = await this.db
      .select({
        id: quests.id,
        title: quests.title,
        description: quests.description,
        status: quests.status,
        experienceReward: quests.experienceReward,
        achievementId: quests.achievementId,
        ownerId: quests.ownerId,
        createdAt: quests.createdAt,
        updatedAt: quests.updatedAt,
        achievement: {
          id: achievements.id,
          title: achievements.title,
          description: achievements.description,
          icon: achievements.icon,
          rarity: achievements.rarity,
          questId: achievements.questId,
        },
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(quests)
      .innerJoin(achievements, eq(quests.achievementId, achievements.id))
      .innerJoin(users, eq(quests.ownerId, users.id))
      .where(eq(quests.id, id));
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }
    return quest;
  }

  async update(id: number, updateQuestDto: UpdateQuestDto) {
    // Если обновляется achievementId, проверяем существование достижения
    if (updateQuestDto.achievementId !== undefined) {
      const [achievement] = await this.db
        .select()
        .from(achievements)
        .where(eq(achievements.id, updateQuestDto.achievementId));
      if (!achievement) {
        throw new NotFoundException(`Достижение с ID ${updateQuestDto.achievementId} не найдено`);
      }
    }

    const updateData: any = { updatedAt: new Date() };
    
    if (updateQuestDto.title !== undefined) {
      updateData.title = updateQuestDto.title;
    }
    if (updateQuestDto.description !== undefined) {
      updateData.description = updateQuestDto.description;
    }
    if (updateQuestDto.status !== undefined) {
      updateData.status = updateQuestDto.status;
    }
    if (updateQuestDto.experienceReward !== undefined) {
      updateData.experienceReward = updateQuestDto.experienceReward;
    }
    if (updateQuestDto.achievementId !== undefined) {
      updateData.achievementId = updateQuestDto.achievementId;
    }

    const result = await this.db
      .update(quests)
      .set(updateData)
      .where(eq(quests.id, id))
      .returning();
    const quest = Array.isArray(result) ? result[0] : result;
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }
    return quest;
  }

  async remove(id: number) {
    const result = await this.db
      .delete(quests)
      .where(eq(quests.id, id))
      .returning();
    const quest = Array.isArray(result) ? result[0] : result;
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }
    return quest;
  }

  async joinQuest(userId: number, questId: number) {
    // Проверяем существование пользователя
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем существование квеста
    const [quest] = await this.db
      .select()
      .from(quests)
      .where(eq(quests.id, questId));
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем, что квест активен
    if (quest.status !== 'active') {
      throw new BadRequestException('Квест не доступен для выполнения');
    }

    // Проверяем, не присоединился ли уже этот квест пользователем
    const [existingUserQuest] = await this.db
      .select()
      .from(userQuests)
      .where(
        and(
          eq(userQuests.userId, userId),
          eq(userQuests.questId, questId),
        ),
      );
    if (existingUserQuest) {
      throw new ConflictException('Пользователь уже присоединился к этому квесту');
    }

    // Присоединяемся к квесту
    const result = await this.db
      .insert(userQuests)
      .values({
        userId,
        questId,
        status: 'in_progress',
      })
      .returning();
    const userQuest = Array.isArray(result) ? result[0] : result;
    if (!userQuest) {
      throw new Error('Не удалось присоединиться к квесту');
    }
    return userQuest;
  }

  async leaveQuest(userId: number, questId: number) {
    // Проверяем существование пользователя
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем существование квеста
    const [quest] = await this.db
      .select()
      .from(quests)
      .where(eq(quests.id, questId));
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем, что пользователь участвует в квесте
    const [userQuest] = await this.db
      .select()
      .from(userQuests)
      .where(
        and(
          eq(userQuests.userId, userId),
          eq(userQuests.questId, questId),
        ),
      );
    if (!userQuest) {
      throw new NotFoundException('Пользователь не участвует в этом квесте');
    }

    // Проверяем, что квест еще не завершен
    if (userQuest.status === 'completed') {
      throw new BadRequestException('Нельзя покинуть уже завершенный квест');
    }

    // Удаляем запись о участии в квесте
    const result = await this.db
      .delete(userQuests)
      .where(eq(userQuests.id, userQuest.id))
      .returning();
    const deletedUserQuest = Array.isArray(result) ? result[0] : result;
    if (!deletedUserQuest) {
      throw new Error('Не удалось покинуть квест');
    }
    return deletedUserQuest;
  }

  async completeQuest(userId: number, questId: number) {
    // Проверяем существование пользователя
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем существование квеста
    const [quest] = await this.db
      .select()
      .from(quests)
      .where(eq(quests.id, questId));
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${questId} не найден`);
    }

    // Проверяем, что квест начат пользователем
    const [userQuest] = await this.db
      .select()
      .from(userQuests)
      .where(
        and(
          eq(userQuests.userId, userId),
          eq(userQuests.questId, questId),
        ),
      );
    if (!userQuest) {
      throw new NotFoundException('Пользователь не начал этот квест');
    }

    if (userQuest.status === 'completed') {
      throw new ConflictException('Квест уже выполнен');
    }

    // Завершаем квест
    const result = await this.db
      .update(userQuests)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(userQuests.id, userQuest.id))
      .returning();
    const completedQuest = Array.isArray(result) ? result[0] : result;
    if (!completedQuest) {
      throw new Error('Не удалось завершить квест');
    }

    // Начисляем опыт пользователю
    const newExperience = user.experience + quest.experienceReward;
    await this.db
      .update(users)
      .set({ experience: newExperience })
      .where(eq(users.id, userId));

    // Присваиваем достижение пользователю, если оно еще не присвоено
    const [existingUserAchievement] = await this.db
      .select()
      .from(userAchievements)
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, quest.achievementId),
        ),
      );
    
    if (!existingUserAchievement) {
      await this.db
        .insert(userAchievements)
        .values({
          userId,
          achievementId: quest.achievementId,
        });
    }

    return completedQuest;
  }

  async getUserQuests(userId: number) {
    // Проверяем существование пользователя
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Получаем все квесты пользователя с информацией о квесте и достижении
    return this.db
      .select({
        id: userQuests.id,
        userId: userQuests.userId,
        questId: userQuests.questId,
        status: userQuests.status,
        startedAt: userQuests.startedAt,
        completedAt: userQuests.completedAt,
        quest: {
          id: quests.id,
          title: quests.title,
          description: quests.description,
          status: quests.status,
          experienceReward: quests.experienceReward,
          achievementId: quests.achievementId,
          ownerId: quests.ownerId,
          createdAt: quests.createdAt,
          updatedAt: quests.updatedAt,
        },
        achievement: {
          id: achievements.id,
          title: achievements.title,
          description: achievements.description,
          icon: achievements.icon,
          rarity: achievements.rarity,
          questId: achievements.questId,
        },
      })
      .from(userQuests)
      .innerJoin(quests, eq(userQuests.questId, quests.id))
      .innerJoin(achievements, eq(quests.achievementId, achievements.id))
      .where(eq(userQuests.userId, userId));
  }

  async getAvailableQuests(userId: number) {
    // Проверяем существование пользователя
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Получаем все активные квесты с информацией о достижении
    const activeQuests = await this.db
      .select({
        id: quests.id,
        title: quests.title,
        description: quests.description,
        status: quests.status,
        experienceReward: quests.experienceReward,
        achievementId: quests.achievementId,
        ownerId: quests.ownerId,
        createdAt: quests.createdAt,
        updatedAt: quests.updatedAt,
        achievement: {
          id: achievements.id,
          title: achievements.title,
          description: achievements.description,
          icon: achievements.icon,
          rarity: achievements.rarity,
          questId: achievements.questId,
        },
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(quests)
      .innerJoin(achievements, eq(quests.achievementId, achievements.id))
      .innerJoin(users, eq(quests.ownerId, users.id))
      .where(eq(quests.status, 'active'));

    // Получаем квесты, которые пользователь уже начал
    const userStartedQuests = await this.db
      .select({ questId: userQuests.questId })
      .from(userQuests)
      .where(eq(userQuests.userId, userId));

    const startedQuestIds = new Set(userStartedQuests.map(uq => uq.questId));

    // Фильтруем квесты, которые пользователь еще не начал
    return activeQuests.filter(quest => !startedQuestIds.has(quest.id));
  }
}

