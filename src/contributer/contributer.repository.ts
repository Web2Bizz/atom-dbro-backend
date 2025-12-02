import { Injectable, Inject, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  questContributers,
  quests,
  users,
  userQuests,
} from '../database/schema';
import { eq, and, ne, sql } from 'drizzle-orm';

@Injectable()
export class ContributerRepository {
  private readonly logger = new Logger(ContributerRepository.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase,
  ) {}

  /**
   * Найти квест по ID (исключая удаленные)
   */
  async findQuestById(questId: number): Promise<typeof quests.$inferSelect | undefined> {
    try {
      const [quest] = await this.db
        .select()
        .from(quests)
        .where(and(
          eq(quests.id, questId),
          ne(quests.recordStatus, 'DELETED')
        ));
      
      return quest;
    } catch (error: any) {
      this.logger.error(`Ошибка в findQuestById для квеста ID ${questId}:`, error);
      throw error;
    }
  }

  /**
   * Найти пользователя по ID (исключая удаленные)
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
   * Проверить, участвует ли пользователь в квесте
   */
  async isUserInQuest(questId: number, userId: number): Promise<boolean> {
    try {
      const [userQuest] = await this.db
        .select()
        .from(userQuests)
        .where(and(
          eq(userQuests.questId, questId),
          eq(userQuests.userId, userId)
        ))
        .limit(1);
      
      return !!userQuest;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в isUserInQuest для квеста ${questId}, пользователь ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Получить всех contributers квеста (только действующих)
   */
  async findContributersByQuest(
    questId: number,
  ): Promise<Array<{
    id: number;
    userId: number;
    firstName: string;
    lastName: string;
    middleName: string | null;
    email: string;
    createdAt: Date;
  }>> {
    try {
      const contributers = await this.db
        .select({
          id: questContributers.id,
          userId: questContributers.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          middleName: users.middleName,
          email: users.email,
          createdAt: questContributers.createdAt,
        })
        .from(questContributers)
        .innerJoin(users, eq(questContributers.userId, users.id))
        .where(and(
          eq(questContributers.questId, questId),
          ne(questContributers.recordStatus, 'DELETED'),
          ne(users.recordStatus, 'DELETED')
        ));
      
      return contributers;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в findContributersByQuest для квеста ${questId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Найти запись contributer (включая удаленные)
   */
  async findContributer(
    questId: number,
    userId: number,
  ): Promise<typeof questContributers.$inferSelect | undefined> {
    try {
      const [contributer] = await this.db
        .select()
        .from(questContributers)
        .where(and(
          eq(questContributers.questId, questId),
          eq(questContributers.userId, userId)
        ));
      
      return contributer;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в findContributer для квеста ${questId}, пользователь ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Создать запись contributer
   */
  async create(
    questId: number,
    userId: number,
  ): Promise<typeof questContributers.$inferSelect> {
    try {
      const result = await this.db
        .insert(questContributers)
        .values({
          questId,
          userId,
          recordStatus: 'CREATED',
        })
        .returning();
      
      const contributer = Array.isArray(result) ? result[0] : result;
      if (!contributer) {
        throw new Error('Не удалось создать запись contributer');
      }
      
      return contributer;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в create для квеста ${questId}, пользователь ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Получить количество уникальных contributers для квеста
   * Используется для отображения количества contributers
   * @param questId ID квеста
   * @returns Количество уникальных contributers или 0
   */
  async getContributersCount(questId: number): Promise<number> {
    try {
      const [result] = await this.db
        .select({
          count: sql<number>`COUNT(DISTINCT ${questContributers.userId})`.as('count'),
        })
        .from(questContributers)
        .where(and(
          eq(questContributers.questId, questId),
          ne(questContributers.recordStatus, 'DELETED')
        ));

      return Number(result?.count ?? 0);
    } catch (error: any) {
      this.logger.error(`Ошибка в getContributersCount для квеста ${questId}:`, error);
      throw error;
    }
  }

  /**
   * Получить количество подтверждённых (с recordStatus = 'CREATED') уникальных contributers для квеста
   * Используется для вычисления процента подтверждённых contributers от общего количества участников квеста
   * @param questId ID квеста
   * @returns Количество подтверждённых уникальных contributers или 0
   */
  async getConfirmedContributersCount(questId: number): Promise<number> {
    try {
      const [result] = await this.db
        .select({
          count: sql<number>`COUNT(DISTINCT ${questContributers.userId})`.as('count'),
        })
        .from(questContributers)
        .where(and(
          eq(questContributers.questId, questId),
          eq(questContributers.recordStatus, 'CREATED')
        ));

      return Number(result?.count ?? 0);
    } catch (error: any) {
      this.logger.error(`Ошибка в getConfirmedContributersCount для квеста ${questId}:`, error);
      throw error;
    }
  }

  /**
   * Восстановить contributer (изменить record_status на CREATED)
   */
  async restore(
    questId: number,
    userId: number,
  ): Promise<typeof questContributers.$inferSelect | undefined> {
    try {
      const [contributer] = await this.db
        .update(questContributers)
        .set({
          recordStatus: 'CREATED',
          updatedAt: new Date(),
        })
        .where(and(
          eq(questContributers.questId, questId),
          eq(questContributers.userId, userId),
          eq(questContributers.recordStatus, 'DELETED')
        ))
        .returning();
      
      return contributer;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в restore для квеста ${questId}, пользователь ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Удалить contributer (soft delete)
   */
  async softDelete(
    questId: number,
    userId: number,
  ): Promise<typeof questContributers.$inferSelect | undefined> {
    try {
      const [contributer] = await this.db
        .update(questContributers)
        .set({
          recordStatus: 'DELETED',
          updatedAt: new Date(),
        })
        .where(and(
          eq(questContributers.questId, questId),
          eq(questContributers.userId, userId),
          ne(questContributers.recordStatus, 'DELETED')
        ))
        .returning();
      
      return contributer;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в softDelete для квеста ${questId}, пользователь ${userId}:`,
        error
      );
      throw error;
    }
  }
}

