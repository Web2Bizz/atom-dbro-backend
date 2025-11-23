import { Injectable, Inject, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  quests,
  userQuests,
  users,
  achievements,
  userAchievements,
  cities,
  organizationTypes,
  categories,
  questCategories,
} from '../database/schema';
import { eq, and, ne, inArray } from 'drizzle-orm';

export interface QuestWithDetails {
  id: number;
  title: string;
  description: string | null;
  status: string;
  experienceReward: number;
  achievementId: number | null;
  ownerId: number;
  cityId: number;
  organizationTypeId: number | null;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
  contacts: any;
  coverImage: string | null;
  gallery: any;
  steps: any;
  createdAt: Date;
  updatedAt: Date;
  achievement: {
    id: number;
    title: string;
    description: string | null;
    icon: string | null;
    rarity: string;
    questId: number | null;
  } | null;
  owner: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  city: {
    id: number;
    name: string;
  } | null;
  organizationType: {
    id: number;
    name: string;
  } | null;
}

@Injectable()
export class QuestRepository {
  private readonly logger = new Logger(QuestRepository.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  /**
   * Найти квест по ID (исключая удаленные)
   * @param id ID квеста
   * @returns Квест или undefined
   */
  async findById(id: number): Promise<typeof quests.$inferSelect | undefined> {
    try {
      const [quest] = await this.db
        .select()
        .from(quests)
        .where(and(
          eq(quests.id, id),
          ne(quests.recordStatus, 'DELETED')
        ));
      
      return quest;
    } catch (error: any) {
      this.logger.error(`Ошибка в findById для квеста ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Найти квест по ID с полной информацией
   * @param id ID квеста
   * @returns Квест с подробностями или undefined
   */
  async findByIdWithDetails(id: number): Promise<QuestWithDetails | undefined> {
    try {
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
          organizationTypeId: quests.organizationTypeId,
          latitude: quests.latitude,
          longitude: quests.longitude,
          address: quests.address,
          contacts: quests.contacts,
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
          organizationType: {
            id: organizationTypes.id,
            name: organizationTypes.name,
          },
        })
        .from(quests)
        .leftJoin(achievements, and(
          eq(quests.achievementId, achievements.id),
          ne(achievements.recordStatus, 'DELETED')
        ))
        .innerJoin(users, and(
          eq(quests.ownerId, users.id),
          ne(users.recordStatus, 'DELETED')
        ))
        .leftJoin(cities, and(
          eq(quests.cityId, cities.id),
          ne(cities.recordStatus, 'DELETED')
        ))
        .leftJoin(organizationTypes, and(
          eq(quests.organizationTypeId, organizationTypes.id),
          ne(organizationTypes.recordStatus, 'DELETED')
        ))
        .where(and(
          eq(quests.id, id),
          ne(quests.recordStatus, 'DELETED')
        ));
      
      return quest as QuestWithDetails | undefined;
    } catch (error: any) {
      this.logger.error(`Ошибка в findByIdWithDetails для квеста ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Найти все квесты с фильтрацией
   * @param cityId ID города (опционально)
   * @param categoryId ID категории (опционально)
   * @returns Массив квестов с деталями
   */
  async findAll(cityId?: number, categoryId?: number): Promise<QuestWithDetails[]> {
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
          organizationTypeId: quests.organizationTypeId,
          latitude: quests.latitude,
          longitude: quests.longitude,
          address: quests.address,
          contacts: quests.contacts,
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
          organizationType: {
            id: organizationTypes.id,
            name: organizationTypes.name,
          },
        })
        .from(quests)
        .leftJoin(achievements, and(
          eq(quests.achievementId, achievements.id),
          ne(achievements.recordStatus, 'DELETED')
        ))
        .innerJoin(users, and(
          eq(quests.ownerId, users.id),
          ne(users.recordStatus, 'DELETED')
        ))
        .leftJoin(cities, and(
          eq(quests.cityId, cities.id),
          ne(cities.recordStatus, 'DELETED')
        ))
        .leftJoin(organizationTypes, and(
          eq(quests.organizationTypeId, organizationTypes.id),
          ne(organizationTypes.recordStatus, 'DELETED')
        ));

      const conditions = [ne(quests.recordStatus, 'DELETED')];
      if (cityId) {
        conditions.push(eq(quests.cityId, cityId));
      }
      if (categoryId) {
        query = query.innerJoin(questCategories, eq(quests.id, questCategories.questId)) as any;
        conditions.push(eq(questCategories.categoryId, categoryId));
      }
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions)) as any;

      return await query as QuestWithDetails[];
    } catch (error: any) {
      this.logger.error('Ошибка в findAll:', error);
      throw error;
    }
  }

  /**
   * Найти квесты по статусу с фильтрацией
   * @param status Статус квеста
   * @param cityId ID города (опционально)
   * @param categoryId ID категории (опционально)
   * @returns Массив квестов
   */
  async findByStatus(status?: 'active' | 'archived' | 'completed', cityId?: number, categoryId?: number) {
    try {
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
        .leftJoin(achievements, and(
          eq(quests.achievementId, achievements.id),
          ne(achievements.recordStatus, 'DELETED')
        ))
        .innerJoin(users, and(
          eq(quests.ownerId, users.id),
          ne(users.recordStatus, 'DELETED')
        ))
        .leftJoin(cities, and(
          eq(quests.cityId, cities.id),
          ne(cities.recordStatus, 'DELETED')
        ));
      
      const conditions = [ne(quests.recordStatus, 'DELETED')];
      if (status) {
        conditions.push(eq(quests.status, status));
      }
      if (cityId) {
        conditions.push(eq(quests.cityId, cityId));
      }
      if (categoryId) {
        baseQuery = baseQuery.innerJoin(questCategories, eq(quests.id, questCategories.questId)) as any;
        conditions.push(eq(questCategories.categoryId, categoryId));
      }
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions)) as any;
      }

      return await baseQuery;
    } catch (error: any) {
      this.logger.error('Ошибка в findByStatus:', error);
      throw error;
    }
  }

  /**
   * Создать квест
   * @param data Данные для создания квеста
   * @returns Созданный квест
   */
  async create(data: {
    title: string;
    description?: string;
    status?: string;
    experienceReward?: number;
    achievementId?: number;
    ownerId: number;
    cityId: number;
    organizationTypeId?: number;
    latitude?: string;
    longitude?: string;
    address?: string;
    contacts?: any;
    coverImage?: string;
    gallery?: any;
    steps?: any;
  }): Promise<typeof quests.$inferSelect> {
    try {
      const result = await this.db
        .insert(quests)
        .values(data)
        .returning();
      
      const quest = Array.isArray(result) ? result[0] : result;
      if (!quest) {
        throw new Error('Не удалось создать квест');
      }

      return quest;
    } catch (error: any) {
      this.logger.error('Ошибка в create:', error);
      throw error;
    }
  }

  /**
   * Обновить квест
   * @param id ID квеста
   * @param data Данные для обновления
   * @returns Обновленный квест или undefined
   */
  async update(id: number, data: any): Promise<typeof quests.$inferSelect | undefined> {
    try {
      const [quest] = await this.db
        .update(quests)
        .set({ ...data, updatedAt: new Date() })
        .where(and(
          eq(quests.id, id),
          ne(quests.recordStatus, 'DELETED')
        ))
        .returning();
      
      return quest;
    } catch (error: any) {
      this.logger.error(`Ошибка в update для квеста ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Мягкое удаление квеста
   * @param id ID квеста
   * @returns Удаленный квест или undefined
   */
  async softDelete(id: number): Promise<typeof quests.$inferSelect | undefined> {
    try {
      const [quest] = await this.db
        .update(quests)
        .set({ recordStatus: 'DELETED', updatedAt: new Date() })
        .where(and(
          eq(quests.id, id),
          ne(quests.recordStatus, 'DELETED')
        ))
        .returning();
      
      return quest;
    } catch (error: any) {
      this.logger.error(`Ошибка в softDelete для квеста ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Архивировать квест
   * @param id ID квеста
   * @returns Архивированный квест или undefined
   */
  async archive(id: number): Promise<typeof quests.$inferSelect | undefined> {
    try {
      const [quest] = await this.db
        .update(quests)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(and(
          eq(quests.id, id),
          ne(quests.recordStatus, 'DELETED')
        ))
        .returning();
      
      return quest;
    } catch (error: any) {
      this.logger.error(`Ошибка в archive для квеста ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Найти пользователя по ID (исключая удаленных)
   * @param userId ID пользователя
   * @returns Пользователь или undefined
   */
  async findUserById(userId: number): Promise<typeof users.$inferSelect | undefined> {
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(and(
          eq(users.id, userId),
          ne(users.recordStatus, 'DELETED')
        ));
      
      return user;
    } catch (error: any) {
      this.logger.error(`Ошибка в findUserById для пользователя ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Обновить опыт пользователя
   * @param userId ID пользователя
   * @param experience Новое значение опыта
   * @returns void
   */
  async updateUserExperience(userId: number, experience: number): Promise<void> {
    try {
      await this.db
        .update(users)
        .set({ experience })
        .where(eq(users.id, userId));
    } catch (error: any) {
      this.logger.error(`Ошибка в updateUserExperience для пользователя ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Найти город по ID (исключая удаленные)
   * @param cityId ID города
   * @returns Город или undefined
   */
  async findCityById(cityId: number): Promise<typeof cities.$inferSelect | undefined> {
    try {
      const [city] = await this.db
        .select()
        .from(cities)
        .where(and(
          eq(cities.id, cityId),
          ne(cities.recordStatus, 'DELETED')
        ));
      
      return city;
    } catch (error: any) {
      this.logger.error(`Ошибка в findCityById для города ID ${cityId}:`, error);
      throw error;
    }
  }

  /**
   * Найти тип организации по ID (исключая удаленные)
   * @param orgTypeId ID типа организации
   * @returns Тип организации или undefined
   */
  async findOrganizationTypeById(orgTypeId: number): Promise<typeof organizationTypes.$inferSelect | undefined> {
    try {
      const [orgType] = await this.db
        .select()
        .from(organizationTypes)
        .where(and(
          eq(organizationTypes.id, orgTypeId),
          ne(organizationTypes.recordStatus, 'DELETED')
        ));
      
      return orgType;
    } catch (error: any) {
      this.logger.error(`Ошибка в findOrganizationTypeById для типа организации ID ${orgTypeId}:`, error);
      throw error;
    }
  }

  /**
   * Найти категории по ID (исключая удаленные)
   * @param categoryIds Массив ID категорий
   * @returns Массив категорий
   */
  async findCategoriesByIds(categoryIds: number[]): Promise<typeof categories.$inferSelect[]> {
    try {
      return await this.db
        .select()
        .from(categories)
        .where(and(
          inArray(categories.id, categoryIds),
          ne(categories.recordStatus, 'DELETED')
        ));
    } catch (error: any) {
      this.logger.error('Ошибка в findCategoriesByIds:', error);
      throw error;
    }
  }

  /**
   * Найти категории для квеста
   * @param questId ID квеста
   * @returns Массив категорий
   */
  async findCategoriesForQuest(questId: number): Promise<Array<{ id: number; name: string }>> {
    try {
      return await this.db
        .select({
          id: categories.id,
          name: categories.name,
        })
        .from(questCategories)
        .innerJoin(categories, eq(questCategories.categoryId, categories.id))
        .where(and(
          eq(questCategories.questId, questId),
          ne(categories.recordStatus, 'DELETED')
        ));
    } catch (error: any) {
      this.logger.error(`Ошибка в findCategoriesForQuest для квеста ID ${questId}:`, error);
      throw error;
    }
  }

  /**
   * Найти категории для нескольких квестов
   * @param questIds Массив ID квестов
   * @returns Массив категорий с questId
   */
  async findCategoriesForQuests(questIds: number[]): Promise<Array<{ questId: number; id: number; name: string }>> {
    try {
      if (questIds.length === 0) {
        return [];
      }
      return await this.db
        .select({
          questId: questCategories.questId,
          id: categories.id,
          name: categories.name,
        })
        .from(questCategories)
        .innerJoin(categories, eq(questCategories.categoryId, categories.id))
        .where(and(
          inArray(questCategories.questId, questIds),
          ne(categories.recordStatus, 'DELETED')
        ));
    } catch (error: any) {
      this.logger.error('Ошибка в findCategoriesForQuests:', error);
      throw error;
    }
  }

  /**
   * Связать квест с категориями
   * @param questId ID квеста
   * @param categoryIds Массив ID категорий
   * @returns void
   */
  async linkQuestToCategories(questId: number, categoryIds: number[]): Promise<void> {
    try {
      await this.db
        .insert(questCategories)
        .values(
          categoryIds.map(categoryId => ({
            questId,
            categoryId,
          }))
        );
    } catch (error: any) {
      this.logger.error(`Ошибка в linkQuestToCategories для квеста ID ${questId}:`, error);
      throw error;
    }
  }

  /**
   * Удалить связи квеста с категориями
   * @param questId ID квеста
   * @returns void
   */
  async unlinkQuestFromCategories(questId: number): Promise<void> {
    try {
      await this.db
        .delete(questCategories)
        .where(eq(questCategories.questId, questId));
    } catch (error: any) {
      this.logger.error(`Ошибка в unlinkQuestFromCategories для квеста ID ${questId}:`, error);
      throw error;
    }
  }

  /**
   * Создать достижение
   * @param data Данные для создания достижения
   * @returns Созданное достижение
   */
  async createAchievement(data: {
    title: string;
    description?: string;
    icon?: string;
    rarity: string;
  }): Promise<typeof achievements.$inferSelect> {
    try {
      const result = await this.db
        .insert(achievements)
        .values(data)
        .returning();
      
      const achievement = Array.isArray(result) ? result[0] : result;
      if (!achievement) {
        throw new Error('Не удалось создать достижение');
      }

      return achievement;
    } catch (error: any) {
      this.logger.error('Ошибка в createAchievement:', error);
      throw error;
    }
  }

  /**
   * Обновить достижение
   * @param id ID достижения
   * @param data Данные для обновления
   * @returns void
   */
  async updateAchievement(id: number, data: { questId: number }): Promise<void> {
    try {
      await this.db
        .update(achievements)
        .set(data)
        .where(eq(achievements.id, id));
    } catch (error: any) {
      this.logger.error(`Ошибка в updateAchievement для достижения ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Найти достижение по ID (исключая удаленные)
   * @param achievementId ID достижения
   * @returns Достижение или undefined
   */
  async findAchievementById(achievementId: number): Promise<typeof achievements.$inferSelect | undefined> {
    try {
      const [achievement] = await this.db
        .select()
        .from(achievements)
        .where(and(
          eq(achievements.id, achievementId),
          ne(achievements.recordStatus, 'DELETED')
        ));
      
      return achievement;
    } catch (error: any) {
      this.logger.error(`Ошибка в findAchievementById для достижения ID ${achievementId}:`, error);
      throw error;
    }
  }

  /**
   * Найти связь пользователя с квестом
   * @param userId ID пользователя
   * @param questId ID квеста
   * @returns UserQuest или undefined
   */
  async findUserQuest(userId: number, questId: number): Promise<typeof userQuests.$inferSelect | undefined> {
    try {
      const [userQuest] = await this.db
        .select()
        .from(userQuests)
        .where(
          and(
            eq(userQuests.userId, userId),
            eq(userQuests.questId, questId),
          ),
        );
      
      return userQuest;
    } catch (error: any) {
      this.logger.error(`Ошибка в findUserQuest для пользователя ID ${userId} и квеста ID ${questId}:`, error);
      throw error;
    }
  }

  /**
   * Создать связь пользователя с квестом
   * @param userId ID пользователя
   * @param questId ID квеста
   * @param status Статус
   * @returns Созданная связь
   */
  async createUserQuest(userId: number, questId: number, status: string): Promise<typeof userQuests.$inferSelect> {
    try {
      const result = await this.db
        .insert(userQuests)
        .values({
          userId,
          questId,
          status,
        })
        .returning();
      
      const userQuest = Array.isArray(result) ? result[0] : result;
      if (!userQuest) {
        throw new Error('Не удалось создать связь пользователя с квестом');
      }

      return userQuest;
    } catch (error: any) {
      this.logger.error(`Ошибка в createUserQuest для пользователя ID ${userId} и квеста ID ${questId}:`, error);
      throw error;
    }
  }

  /**
   * Обновить связь пользователя с квестом
   * @param userQuestId ID связи
   * @param data Данные для обновления
   * @returns Обновленная связь или undefined
   */
  async updateUserQuest(userQuestId: number, data: { status?: string; completedAt?: Date }): Promise<typeof userQuests.$inferSelect | undefined> {
    try {
      const [userQuest] = await this.db
        .update(userQuests)
        .set(data)
        .where(eq(userQuests.id, userQuestId))
        .returning();
      
      return userQuest;
    } catch (error: any) {
      this.logger.error(`Ошибка в updateUserQuest для связи ID ${userQuestId}:`, error);
      throw error;
    }
  }

  /**
   * Удалить связь пользователя с квестом
   * @param userQuestId ID связи
   * @returns Удаленная связь или undefined
   */
  async deleteUserQuest(userQuestId: number): Promise<typeof userQuests.$inferSelect | undefined> {
    try {
      const [userQuest] = await this.db
        .delete(userQuests)
        .where(eq(userQuests.id, userQuestId))
        .returning();
      
      return userQuest;
    } catch (error: any) {
      this.logger.error(`Ошибка в deleteUserQuest для связи ID ${userQuestId}:`, error);
      throw error;
    }
  }

  /**
   * Найти связь пользователя с достижением
   * @param userId ID пользователя
   * @param achievementId ID достижения
   * @returns UserAchievement или undefined
   */
  async findUserAchievement(userId: number, achievementId: number): Promise<typeof userAchievements.$inferSelect | undefined> {
    try {
      const [userAchievement] = await this.db
        .select()
        .from(userAchievements)
        .where(
          and(
            eq(userAchievements.userId, userId),
            eq(userAchievements.achievementId, achievementId),
          ),
        );
      
      return userAchievement;
    } catch (error: any) {
      this.logger.error(`Ошибка в findUserAchievement для пользователя ID ${userId} и достижения ID ${achievementId}:`, error);
      throw error;
    }
  }

  /**
   * Создать связь пользователя с достижением
   * @param userId ID пользователя
   * @param achievementId ID достижения
   * @returns Созданная связь
   */
  async createUserAchievement(userId: number, achievementId: number): Promise<typeof userAchievements.$inferSelect> {
    try {
      const result = await this.db
        .insert(userAchievements)
        .values({
          userId,
          achievementId,
        })
        .returning();
      
      const userAchievement = Array.isArray(result) ? result[0] : result;
      if (!userAchievement) {
        throw new Error('Не удалось создать связь пользователя с достижением');
      }

      return userAchievement;
    } catch (error: any) {
      this.logger.error(`Ошибка в createUserAchievement для пользователя ID ${userId} и достижения ID ${achievementId}:`, error);
      throw error;
    }
  }

  /**
   * Получить квесты пользователя
   * @param userId ID пользователя
   * @returns Массив квестов пользователя
   */
  async findUserQuests(userId: number) {
    try {
      return await this.db
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
        .innerJoin(quests, and(
          eq(userQuests.questId, quests.id),
          ne(quests.recordStatus, 'DELETED')
        ))
        .leftJoin(achievements, and(
          eq(quests.achievementId, achievements.id),
          ne(achievements.recordStatus, 'DELETED')
        ))
        .leftJoin(cities, and(
          eq(quests.cityId, cities.id),
          ne(cities.recordStatus, 'DELETED')
        ))
        .where(eq(userQuests.userId, userId));
    } catch (error: any) {
      this.logger.error(`Ошибка в findUserQuests для пользователя ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Получить доступные квесты (активные, исключая те, к которым пользователь присоединился)
   * @param userId ID пользователя
   * @returns Массив активных квестов
   */
  async findAvailableQuests(userId: number) {
    try {
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
        .leftJoin(achievements, and(
          eq(quests.achievementId, achievements.id),
          ne(achievements.recordStatus, 'DELETED')
        ))
        .innerJoin(users, and(
          eq(quests.ownerId, users.id),
          ne(users.recordStatus, 'DELETED')
        ))
        .leftJoin(cities, and(
          eq(quests.cityId, cities.id),
          ne(cities.recordStatus, 'DELETED')
        ))
        .where(and(
          eq(quests.status, 'active'),
          ne(quests.recordStatus, 'DELETED')
        ));

      return activeQuests;
    } catch (error: any) {
      this.logger.error(`Ошибка в findAvailableQuests для пользователя ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Получить ID квестов, к которым пользователь присоединился
   * @param userId ID пользователя
   * @returns Массив ID квестов
   */
  async findUserStartedQuestIds(userId: number): Promise<number[]> {
    try {
      const userStartedQuests = await this.db
        .select({ questId: userQuests.questId })
        .from(userQuests)
        .where(eq(userQuests.userId, userId));
      
      return userStartedQuests.map(uq => uq.questId);
    } catch (error: any) {
      this.logger.error(`Ошибка в findUserStartedQuestIds для пользователя ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Найти данные пользователя для события
   * @param userId ID пользователя
   * @returns Данные пользователя
   */
  async findUserDataForEvent(userId: number) {
    try {
      const [userData] = await this.db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(and(
          eq(users.id, userId),
          ne(users.recordStatus, 'DELETED')
        ));
      
      return userData;
    } catch (error: any) {
      this.logger.error(`Ошибка в findUserDataForEvent для пользователя ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Найти данные квеста для события
   * @param questId ID квеста
   * @returns Данные квеста
   */
  async findQuestDataForEvent(questId: number) {
    try {
      const [questData] = await this.db
        .select({
          id: quests.id,
          title: quests.title,
          status: quests.status,
          experienceReward: quests.experienceReward,
        })
        .from(quests)
        .where(and(
          eq(quests.id, questId),
          ne(quests.recordStatus, 'DELETED')
        ));
      
      return questData;
    } catch (error: any) {
      this.logger.error(`Ошибка в findQuestDataForEvent для квеста ID ${questId}:`, error);
      throw error;
    }
  }

  /**
   * Найти всех участников квеста
   * @param questId ID квеста
   * @returns Массив участников с их userQuest
   */
  async findQuestParticipants(questId: number): Promise<Array<{
    userId: number;
    userQuestId: number;
    userQuestStatus: string;
    user: typeof users.$inferSelect;
  }>> {
    try {
      const participants = await this.db
        .select({
          userId: userQuests.userId,
          userQuestId: userQuests.id,
          userQuestStatus: userQuests.status,
          user: users,
        })
        .from(userQuests)
        .innerJoin(users, and(
          eq(userQuests.userId, users.id),
          ne(users.recordStatus, 'DELETED')
        ))
        .where(eq(userQuests.questId, questId));
      
      return participants;
    } catch (error: any) {
      this.logger.error(`Ошибка в findQuestParticipants для квеста ID ${questId}:`, error);
      throw error;
    }
  }

  /**
   * Найти пользователей квеста (только id и ФИО)
   * @param questId ID квеста
   * @returns Массив пользователей с id и ФИО
   */
  async findQuestUsers(questId: number): Promise<Array<{
    id: number;
    firstName: string;
    lastName: string;
    middleName: string | null;
  }>> {
    try {
      const questUsers = await this.db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          middleName: users.middleName,
        })
        .from(userQuests)
        .innerJoin(users, and(
          eq(userQuests.userId, users.id),
          ne(users.recordStatus, 'DELETED')
        ))
        .where(eq(userQuests.questId, questId));
      
      return questUsers;
    } catch (error: any) {
      this.logger.error(`Ошибка в findQuestUsers для квеста ID ${questId}:`, error);
      throw error;
    }
  }
}

