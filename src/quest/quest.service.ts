import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { quests, userQuests, users, achievements, userAchievements, cities, helpTypes, questHelpTypes } from '../database/schema';
import { eq, and, ne, inArray } from 'drizzle-orm';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';
import { QuestEventsService } from './quest.events';

@Injectable()
export class QuestService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
    private questEventsService: QuestEventsService,
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

    let achievementId: number | undefined = undefined;

    // Создаем достижение только если оно указано
    if (createQuestDto.achievement) {
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
      achievementId = achievement.id;
    }

    // Проверяем существование города, если указан
    if (createQuestDto.cityId) {
      const [city] = await this.db
        .select()
        .from(cities)
        .where(eq(cities.id, createQuestDto.cityId));
      if (!city) {
        throw new NotFoundException(`Город с ID ${createQuestDto.cityId} не найден`);
      }
    }

    // Проверяем существование типов помощи, если указаны
    if (createQuestDto.helpTypeIds && createQuestDto.helpTypeIds.length > 0) {
      const existingHelpTypes = await this.db
        .select()
        .from(helpTypes)
        .where(inArray(helpTypes.id, createQuestDto.helpTypeIds));
      if (existingHelpTypes.length !== createQuestDto.helpTypeIds.length) {
        throw new NotFoundException('Один или несколько типов помощи не найдены');
      }
    }

    // Валидация галереи (максимум 10 элементов)
    if (createQuestDto.gallery && createQuestDto.gallery.length > 10) {
      throw new BadRequestException('Галерея не может содержать более 10 изображений');
    }

    // Создаем квест с привязкой к достижению (если указано) и владельцем
    const questResult = await this.db
      .insert(quests)
      .values({
        title: createQuestDto.title,
        description: createQuestDto.description,
        status: createQuestDto.status || 'active',
        experienceReward: createQuestDto.experienceReward || 0,
        achievementId: achievementId,
        ownerId: userId,
        cityId: createQuestDto.cityId,
        coverImage: createQuestDto.coverImage,
        gallery: createQuestDto.gallery,
        steps: createQuestDto.steps,
      })
      .returning();
    const quest = Array.isArray(questResult) ? questResult[0] : questResult;
    if (!quest) {
      throw new Error('Не удалось создать квест');
    }

    // Обновляем достижение с questId (если достижение было создано)
    if (achievementId) {
      await this.db
        .update(achievements)
        .set({ questId: quest.id })
        .where(eq(achievements.id, achievementId));
    }

    // Связываем квест с типами помощи, если указаны
    if (createQuestDto.helpTypeIds && createQuestDto.helpTypeIds.length > 0) {
      await this.db
        .insert(questHelpTypes)
        .values(
          createQuestDto.helpTypeIds.map(helpTypeId => ({
            questId: quest.id,
            helpTypeId,
          }))
        );
    }

    // Возвращаем квест с информацией о достижении (если есть), городе и типах помощи
    const query = this.db
      .select({
        id: quests.id,
        title: quests.title,
        description: quests.description,
        status: quests.status,
        experienceReward: quests.experienceReward,
        achievementId: quests.achievementId,
        ownerId: quests.ownerId,
        cityId: quests.cityId,
        coverImage: quests.coverImage,
        gallery: quests.gallery,
        steps: quests.steps,
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
        city: {
          id: cities.id,
          name: cities.name,
        },
      })
      .from(quests)
      .leftJoin(achievements, eq(quests.achievementId, achievements.id))
      .innerJoin(users, eq(quests.ownerId, users.id))
      .leftJoin(cities, eq(quests.cityId, cities.id))
      .where(eq(quests.id, quest.id));
    
    const [questWithAchievement] = await query;

    // Получаем типы помощи для квеста
    const questHelpTypesData = await this.db
      .select({
        id: helpTypes.id,
        name: helpTypes.name,
      })
      .from(questHelpTypes)
      .innerJoin(helpTypes, eq(questHelpTypes.helpTypeId, helpTypes.id))
      .where(eq(questHelpTypes.questId, quest.id));

    const questWithAllData = {
      ...questWithAchievement,
      helpTypes: questHelpTypesData,
    };

    // Автоматически присоединяем создателя к квесту
    const userQuestResult = await this.db
      .insert(userQuests)
      .values({
        userId,
        questId: quest.id,
        status: 'in_progress',
      })
      .returning();
    const userQuest = Array.isArray(userQuestResult) ? userQuestResult[0] : userQuestResult;
    
    if (userQuest) {
      // Получаем данные пользователя для события присоединения
      const [userData] = await this.db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, userId));

      // Эмитим событие присоединения пользователя
      this.questEventsService.emitUserJoined(quest.id, userId, userData || {});
    }

    // Эмитим событие создания квеста
    this.questEventsService.emitQuestCreated(quest.id, questWithAllData);

    return questWithAllData;
  }

  async findAll(cityId?: number, helpTypeId?: number) {
    try {
      let query = this.db
        .select({
          id: quests.id,
          title: quests.title,
          description: quests.description,
          status: quests.status,
          experienceReward: quests.experienceReward,
          achievementId: quests.achievementId,
          ownerId: quests.ownerId,
          cityId: quests.cityId,
          coverImage: quests.coverImage,
          gallery: quests.gallery,
          steps: quests.steps,
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
          city: {
            id: cities.id,
            name: cities.name,
          },
        })
        .from(quests)
        .leftJoin(achievements, eq(quests.achievementId, achievements.id))
        .innerJoin(users, eq(quests.ownerId, users.id))
        .leftJoin(cities, eq(quests.cityId, cities.id));

      // Применяем фильтры
      const conditions = [];
      if (cityId) {
        conditions.push(eq(quests.cityId, cityId));
      }
      if (helpTypeId) {
        query = query.innerJoin(questHelpTypes, eq(quests.id, questHelpTypes.questId)) as any;
        conditions.push(eq(questHelpTypes.helpTypeId, helpTypeId));
      }
      if (conditions.length > 0) {
        query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions)) as any;
      }

      const questsList = await query;

      // Получаем типы помощи для всех квестов
      const questIds = questsList.map(q => q.id);
      const allHelpTypes = questIds.length > 0
        ? await this.db
            .select({
              questId: questHelpTypes.questId,
              id: helpTypes.id,
              name: helpTypes.name,
            })
            .from(questHelpTypes)
            .innerJoin(helpTypes, eq(questHelpTypes.helpTypeId, helpTypes.id))
            .where(inArray(questHelpTypes.questId, questIds))
        : [];

      // Группируем типы помощи по questId
      const helpTypesByQuestId = new Map<number, Array<{ id: number; name: string }>>();
      for (const helpType of allHelpTypes) {
        if (!helpTypesByQuestId.has(helpType.questId)) {
          helpTypesByQuestId.set(helpType.questId, []);
        }
        helpTypesByQuestId.get(helpType.questId)!.push({
          id: helpType.id,
          name: helpType.name,
        });
      }

      return questsList.map(quest => ({
        ...quest,
        helpTypes: helpTypesByQuestId.get(quest.id) || [],
      }));
    } catch (error: any) {
      console.error('Ошибка в findAll:', error);
      console.error('Детали ошибки:', {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        hint: error?.hint,
        where: error?.where,
        stack: error?.stack,
      });
      throw error;
    }
  }

  async findByStatus(status?: 'active' | 'archived' | 'completed', cityId?: number, helpTypeId?: number) {
    let baseQuery = this.db
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
      .leftJoin(achievements, eq(quests.achievementId, achievements.id))
      .innerJoin(users, eq(quests.ownerId, users.id))
      .leftJoin(cities, eq(quests.cityId, cities.id));
    
    // Применяем фильтры
    const conditions = [];
    if (status) {
      conditions.push(eq(quests.status, status));
    }
    if (cityId) {
      conditions.push(eq(quests.cityId, cityId));
    }
    if (helpTypeId) {
      baseQuery = baseQuery.innerJoin(questHelpTypes, eq(quests.id, questHelpTypes.questId)) as any;
      conditions.push(eq(questHelpTypes.helpTypeId, helpTypeId));
    }
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions)) as any;
    }

    const questsList = await baseQuery;

    // Получаем типы помощи для всех квестов
    const questIds = questsList.map(q => q.id);
    const allHelpTypes = questIds.length > 0
      ? await this.db
          .select({
            questId: questHelpTypes.questId,
            id: helpTypes.id,
            name: helpTypes.name,
          })
          .from(questHelpTypes)
          .innerJoin(helpTypes, eq(questHelpTypes.helpTypeId, helpTypes.id))
          .where(inArray(questHelpTypes.questId, questIds))
      : [];

    // Группируем типы помощи по questId
    const helpTypesByQuestId = new Map<number, Array<{ id: number; name: string }>>();
    for (const helpType of allHelpTypes) {
      if (!helpTypesByQuestId.has(helpType.questId)) {
        helpTypesByQuestId.set(helpType.questId, []);
      }
      helpTypesByQuestId.get(helpType.questId)!.push({
        id: helpType.id,
        name: helpType.name,
      });
    }

    return questsList.map(quest => ({
      ...quest,
      helpTypes: helpTypesByQuestId.get(quest.id) || [],
    }));
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
        cityId: quests.cityId,
        coverImage: quests.coverImage,
        gallery: quests.gallery,
        steps: quests.steps,
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
        city: {
          id: cities.id,
          name: cities.name,
        },
      })
      .from(quests)
      .leftJoin(achievements, eq(quests.achievementId, achievements.id))
      .innerJoin(users, eq(quests.ownerId, users.id))
      .leftJoin(cities, eq(quests.cityId, cities.id))
      .where(eq(quests.id, id));
    if (!quest) {
      throw new NotFoundException(`Квест с ID ${id} не найден`);
    }

    // Получаем типы помощи для квеста
    const questHelpTypesData = await this.db
      .select({
        id: helpTypes.id,
        name: helpTypes.name,
      })
      .from(questHelpTypes)
      .innerJoin(helpTypes, eq(questHelpTypes.helpTypeId, helpTypes.id))
      .where(eq(questHelpTypes.questId, id));

    return {
      ...quest,
      helpTypes: questHelpTypesData,
    };
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
    if (updateQuestDto.cityId !== undefined) {
      // Проверяем существование города, если указан
      if (updateQuestDto.cityId !== null) {
        const [city] = await this.db
          .select()
          .from(cities)
          .where(eq(cities.id, updateQuestDto.cityId));
        if (!city) {
          throw new NotFoundException(`Город с ID ${updateQuestDto.cityId} не найден`);
        }
      }
      updateData.cityId = updateQuestDto.cityId;
    }
    if (updateQuestDto.coverImage !== undefined) {
      updateData.coverImage = updateQuestDto.coverImage;
    }
    if (updateQuestDto.gallery !== undefined) {
      // Валидация галереи (максимум 10 элементов)
      if (updateQuestDto.gallery && updateQuestDto.gallery.length > 10) {
        throw new BadRequestException('Галерея не может содержать более 10 изображений');
      }
      updateData.gallery = updateQuestDto.gallery;
    }
    if (updateQuestDto.steps !== undefined) {
      updateData.steps = updateQuestDto.steps;
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

    // Обновляем типы помощи, если указаны
    if (updateQuestDto.helpTypeIds !== undefined) {
      // Удаляем старые связи
      await this.db
        .delete(questHelpTypes)
        .where(eq(questHelpTypes.questId, id));

      // Проверяем существование типов помощи, если указаны
      if (updateQuestDto.helpTypeIds.length > 0) {
        const existingHelpTypes = await this.db
          .select()
          .from(helpTypes)
          .where(inArray(helpTypes.id, updateQuestDto.helpTypeIds));
        if (existingHelpTypes.length !== updateQuestDto.helpTypeIds.length) {
          throw new NotFoundException('Один или несколько типов помощи не найдены');
        }

        // Создаем новые связи
        await this.db
          .insert(questHelpTypes)
          .values(
            updateQuestDto.helpTypeIds.map(helpTypeId => ({
              questId: id,
              helpTypeId,
            }))
          );
      }
    }

    // Возвращаем обновленный квест с полной информацией
    return this.findOne(id);
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

    // Получаем данные пользователя для события
    const [userData] = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId));

    // Эмитим событие присоединения пользователя
    this.questEventsService.emitUserJoined(questId, userId, userData || {});

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

    // Получаем данные квеста для события
    const [questData] = await this.db
      .select({
        id: quests.id,
        title: quests.title,
        status: quests.status,
        experienceReward: quests.experienceReward,
      })
      .from(quests)
      .where(eq(quests.id, questId));

    // Эмитим событие завершения квеста
    this.questEventsService.emitQuestCompleted(questId, userId, questData || {});

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
    const result = await this.db
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
          cityId: quests.cityId,
          coverImage: quests.coverImage,
          gallery: quests.gallery,
          steps: quests.steps,
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
        city: {
          id: cities.id,
          name: cities.name,
        },
      })
      .from(userQuests)
      .innerJoin(quests, eq(userQuests.questId, quests.id))
      .leftJoin(achievements, eq(quests.achievementId, achievements.id))
      .leftJoin(cities, eq(quests.cityId, cities.id))
      .where(eq(userQuests.userId, userId));

    // Получаем типы помощи для всех квестов
    const questIds = result.map(r => r.questId);
    const allHelpTypes = questIds.length > 0
      ? await this.db
          .select({
            questId: questHelpTypes.questId,
            id: helpTypes.id,
            name: helpTypes.name,
          })
          .from(questHelpTypes)
          .innerJoin(helpTypes, eq(questHelpTypes.helpTypeId, helpTypes.id))
          .where(inArray(questHelpTypes.questId, questIds))
      : [];

    const helpTypesByQuestId = new Map<number, Array<{ id: number; name: string }>>();
    for (const helpType of allHelpTypes) {
      if (!helpTypesByQuestId.has(helpType.questId)) {
        helpTypesByQuestId.set(helpType.questId, []);
      }
      helpTypesByQuestId.get(helpType.questId)!.push({
        id: helpType.id,
        name: helpType.name,
      });
    }

    return result.map(item => ({
      ...item,
      quest: {
        ...item.quest,
        helpTypes: helpTypesByQuestId.get(item.questId) || [],
      },
    }));
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
        cityId: quests.cityId,
        coverImage: quests.coverImage,
        gallery: quests.gallery,
        steps: quests.steps,
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
        city: {
          id: cities.id,
          name: cities.name,
        },
      })
      .from(quests)
      .leftJoin(achievements, eq(quests.achievementId, achievements.id))
      .innerJoin(users, eq(quests.ownerId, users.id))
      .leftJoin(cities, eq(quests.cityId, cities.id))
      .where(eq(quests.status, 'active'));

    // Получаем квесты, которые пользователь уже начал
    const userStartedQuests = await this.db
      .select({ questId: userQuests.questId })
      .from(userQuests)
      .where(eq(userQuests.userId, userId));

    const startedQuestIds = new Set(userStartedQuests.map(uq => uq.questId));

    // Фильтруем квесты, которые пользователь еще не начал
    const filteredQuests = activeQuests.filter(quest => !startedQuestIds.has(quest.id));

    // Получаем типы помощи для всех квестов
    const questIds = filteredQuests.map(q => q.id);
    const allHelpTypes = questIds.length > 0
      ? await this.db
          .select({
            questId: questHelpTypes.questId,
            id: helpTypes.id,
            name: helpTypes.name,
          })
          .from(questHelpTypes)
          .innerJoin(helpTypes, eq(questHelpTypes.helpTypeId, helpTypes.id))
          .where(inArray(questHelpTypes.questId, questIds))
      : [];

    // Группируем типы помощи по questId
    const helpTypesByQuestId = new Map<number, Array<{ id: number; name: string }>>();
    for (const helpType of allHelpTypes) {
      if (!helpTypesByQuestId.has(helpType.questId)) {
        helpTypesByQuestId.set(helpType.questId, []);
      }
      helpTypesByQuestId.get(helpType.questId)!.push({
        id: helpType.id,
        name: helpType.name,
      });
    }

    return filteredQuests.map(quest => ({
      ...quest,
      helpTypes: helpTypesByQuestId.get(quest.id) || [],
    }));
  }
}

