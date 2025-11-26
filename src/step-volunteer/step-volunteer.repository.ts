import { Injectable, Inject, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  questStepVolunteers,
  quests,
  users,
} from '../database/schema';
import { eq, and, ne } from 'drizzle-orm';

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
   * Получить всех волонтёров этапа (только действующих)
   */
  async findVolunteersByQuestAndStep(
    questId: number,
    stepIndex: number,
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
          eq(questStepVolunteers.stepIndex, stepIndex),
          ne(questStepVolunteers.recordStatus, 'DELETED'),
          ne(users.recordStatus, 'DELETED')
        ));
      
      return volunteers;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в findVolunteersByQuestAndStep для квеста ${questId}, этап ${stepIndex}:`,
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
    stepIndex: number,
    userId: number,
  ): Promise<typeof questStepVolunteers.$inferSelect | undefined> {
    try {
      const [volunteer] = await this.db
        .select()
        .from(questStepVolunteers)
        .where(and(
          eq(questStepVolunteers.questId, questId),
          eq(questStepVolunteers.stepIndex, stepIndex),
          eq(questStepVolunteers.userId, userId)
        ));
      
      return volunteer;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в findVolunteer для квеста ${questId}, этап ${stepIndex}, пользователь ${userId}:`,
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
    stepIndex: number,
    userId: number,
  ): Promise<typeof questStepVolunteers.$inferSelect> {
    try {
      const [volunteer] = await this.db
        .insert(questStepVolunteers)
        .values({
          questId,
          stepIndex,
          userId,
          recordStatus: 'CREATED',
        })
        .returning();
      
      return volunteer;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в create для квеста ${questId}, этап ${stepIndex}, пользователь ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Восстановить волонтёра (изменить record_status на CREATED)
   */
  async restore(
    questId: number,
    stepIndex: number,
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
          eq(questStepVolunteers.stepIndex, stepIndex),
          eq(questStepVolunteers.userId, userId),
          eq(questStepVolunteers.recordStatus, 'DELETED')
        ))
        .returning();
      
      return volunteer;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в restore для квеста ${questId}, этап ${stepIndex}, пользователь ${userId}:`,
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
    stepIndex: number,
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
          eq(questStepVolunteers.stepIndex, stepIndex),
          eq(questStepVolunteers.userId, userId),
          ne(questStepVolunteers.recordStatus, 'DELETED')
        ))
        .returning();
      
      return volunteer;
    } catch (error: any) {
      this.logger.error(
        `Ошибка в softDelete для квеста ${questId}, этап ${stepIndex}, пользователь ${userId}:`,
        error
      );
      throw error;
    }
  }
}

