import { Injectable, Inject, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  questStepVolunteers,
  quests,
  users,
  userQuests,
} from '../database/schema';
import { eq, and, ne, sql } from 'drizzle-orm';

@Injectable()
export class StepVolunteerRepository {
  private readonly logger = new Logger(StepVolunteerRepository.name);

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
   * Получить всех волонтёров этапа по типу шага (только действующих)
   */
  async findVolunteersByQuestAndStep(
    questId: number,
    type: string,
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
      const volunteers = await this.db
        .select({
          id: questStepVolunteers.id,
          userId: questStepVolunteers.userId,
          // type: questStepVolunteers.type,
          // contributeValue: questStepVolunteers.contributeValue,
          firstName: users.firstName,
          lastName: users.lastName,
          middleName: users.middleName,
          email: users.email,
          createdAt: questStepVolunteers.createdAt,
        })
        .from(questStepVolunteers)
        .innerJoin(users, eq(questStepVolunteers.userId, users.id))
        .where(and(
          eq(questStepVolunteers.questId, questId),
          eq(questStepVolunteers.type, type),
          ne(questStepVolunteers.recordStatus, 'DELETED'),
          ne(users.recordStatus, 'DELETED')
        ));
      
      return volunteers;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в findVolunteersByQuestAndStep для квеста ${questId}, type ${type}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Найти запись волонтёра (включая удаленные)
   */
  async findVolunteer(
    questId: number,
    type: string,
    userId: number,
  ): Promise<typeof questStepVolunteers.$inferSelect | undefined> {
    try {
      const [volunteer] = await this.db
        .select()
        .from(questStepVolunteers)
        .where(and(
          eq(questStepVolunteers.questId, questId),
          eq(questStepVolunteers.type, type),
          eq(questStepVolunteers.userId, userId)
        ));
      
      return volunteer;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в findVolunteer для квеста ${questId}, type ${type}, пользователь ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Создать запись волонтёра
   */
  async create(
    questId: number,
    type: string,
    userId: number,
    contributeValue: number = 0,
  ): Promise<typeof questStepVolunteers.$inferSelect> {
    try {
      const result = await this.db
        .insert(questStepVolunteers)
        .values({
          questId,
          type,
          userId,
          contributeValue,
          recordStatus: 'CREATED',
        })
        .returning();
      
      const volunteer = Array.isArray(result) ? result[0] : result;
      if (!volunteer) {
        throw new Error('Не удалось создать запись волонтёра');
      }
      
      return volunteer;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в create для квеста ${questId}, type ${type}, пользователь ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Создать новую запись волонтёра этапа квеста с вкладом
   * Всегда создаёт новую запись, даже если пользователь уже вносил вклад ранее
   * @param questId ID квеста
   * @param type Тип этапа
   * @param userId ID пользователя
   * @param contributeValue Значение вклада
   * @returns Созданная запись
   */
  async createStepVolunteer(
    questId: number,
    type: string,
    userId: number,
    contributeValue: number,
  ): Promise<typeof questStepVolunteers.$inferSelect> {
    try {
      // Всегда создаём новую запись
      const result = await this.db
        .insert(questStepVolunteers)
        .values({
          questId,
          type,
          userId,
          contributeValue,
        })
        .returning();
      
      const created = Array.isArray(result) ? result[0] : result;
      if (!created) {
        throw new Error('Не удалось создать запись волонтёра этапа');
      }

      return created;
    } catch (error: any) {
      this.logger.error(`Ошибка в createStepVolunteer для квеста ${questId}, type ${type}, userId ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Получить сумму всех contribute_value для квеста и типа шага
   * Используется для синхронизации currentValue в этапе квеста
   * @param questId ID квеста
   * @param type Тип шага
   * @returns Сумма contribute_value или 0
   */
  async getSumContributeValue(questId: number, type: string): Promise<number> {
    try {
      const [result] = await this.db
        .select({
          sum: sql<number>`COALESCE(SUM(${questStepVolunteers.contributeValue}::integer), 0)`.as('sum'),
        })
        .from(questStepVolunteers)
        .where(and(
          eq(questStepVolunteers.questId, questId),
          eq(questStepVolunteers.type, type),
          ne(questStepVolunteers.recordStatus, 'DELETED')
        ));

      return Number(result?.sum ?? 0);
    } catch (error: any) {
      this.logger.error(`Ошибка в getSumContributeValue для квеста ${questId}, type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Получить количество уникальных волонтёров для квеста и типа шага
   * Используется для отображения количества вкладов в этапах
   * @param questId ID квеста
   * @param type Тип шага
   * @returns Количество уникальных волонтёров или 0
   */
  async getVolunteersCount(questId: number, type: string): Promise<number> {
    try {
      const [result] = await this.db
        .select({
          count: sql<number>`COUNT(DISTINCT ${questStepVolunteers.userId})`.as('count'),
        })
        .from(questStepVolunteers)
        .where(and(
          eq(questStepVolunteers.questId, questId),
          eq(questStepVolunteers.type, type),
          ne(questStepVolunteers.recordStatus, 'DELETED')
        ));

      return Number(result?.count ?? 0);
    } catch (error: any) {
      this.logger.error(`Ошибка в getVolunteersCount для квеста ${questId}, type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Получить количество подтверждённых (с recordStatus = 'CREATED') уникальных волонтёров для квеста и типа шага
   * Используется для вычисления процента подтверждённых волонтёров от общего количества участников квеста
   * @param questId ID квеста
   * @param type Тип шага
   * @returns Количество подтверждённых уникальных волонтёров или 0
   */
  async getConfirmedVolunteersCount(questId: number, type: string): Promise<number> {
    try {
      const [result] = await this.db
        .select({
          count: sql<number>`COUNT(DISTINCT ${questStepVolunteers.userId})`.as('count'),
        })
        .from(questStepVolunteers)
        .where(and(
          eq(questStepVolunteers.questId, questId),
          eq(questStepVolunteers.type, type),
          eq(questStepVolunteers.recordStatus, 'CREATED')
        ));

      return Number(result?.count ?? 0);
    } catch (error: any) {
      this.logger.error(`Ошибка в getConfirmedVolunteersCount для квеста ${questId}, type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Восстановить волонтёра (изменить record_status на CREATED)
   */
  async restore(
    questId: number,
    type: string,
    userId: number,
  ): Promise<typeof questStepVolunteers.$inferSelect | undefined> {
    try {
      const [volunteer] = await this.db
        .update(questStepVolunteers)
        .set({
          recordStatus: 'CREATED',
          updatedAt: new Date(),
        })
        .where(and(
          eq(questStepVolunteers.questId, questId),
          eq(questStepVolunteers.type, type),
          eq(questStepVolunteers.userId, userId),
          eq(questStepVolunteers.recordStatus, 'DELETED')
        ))
        .returning();
      
      return volunteer;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в restore для квеста ${questId}, type ${type}, пользователь ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Удалить волонтёра (soft delete)
   */
  async softDelete(
    questId: number,
    type: string,
    userId: number,
  ): Promise<typeof questStepVolunteers.$inferSelect | undefined> {
    try {
      const [volunteer] = await this.db
        .update(questStepVolunteers)
        .set({
          recordStatus: 'DELETED',
          updatedAt: new Date(),
        })
        .where(and(
          eq(questStepVolunteers.questId, questId),
          eq(questStepVolunteers.type, type),
          eq(questStepVolunteers.userId, userId),
          ne(questStepVolunteers.recordStatus, 'DELETED')
        ))
        .returning();
      
      return volunteer;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в softDelete для квеста ${questId}, type ${type}, пользователь ${userId}:`,
        error
      );
      throw error;
    }
  }
}

