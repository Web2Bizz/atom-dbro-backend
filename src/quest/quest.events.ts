import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { QuestStep } from './quest.repository';

/**
 * Данные события создания квеста
 */
export interface QuestCreatedEventData {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  [key: string]: any;
}

/**
 * Данные события присоединения пользователя
 */
export interface UserJoinedEventData {
  userId: number;
  id?: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  [key: string]: any;
}

/**
 * Данные события завершения квеста
 */
export interface QuestCompletedEventData {
  userId: number;
  id?: number;
  title?: string;
  status?: string;
  experienceReward?: number;
  achievementId?: number | null;
  [key: string]: any;
}

/**
 * Данные события обновления requirements
 */
export interface RequirementUpdatedEventData {
  steps: QuestStep[];
}

/**
 * Данные события добавления step volunteer
 */
export interface StepVolunteerAddedEventData {
  stepType: 'finance' | 'material';
  userId: number;
  contributeValue: number;
}

/**
 * Данные события подтверждения checkin
 */
export interface CheckinConfirmedEventData {
  stepType: 'finance' | 'material' | 'contributers';
  userId: number;
}

/**
 * Объединенный тип данных событий
 */
export type QuestEventData =
  | QuestCreatedEventData
  | UserJoinedEventData
  | QuestCompletedEventData
  | RequirementUpdatedEventData
  | StepVolunteerAddedEventData
  | CheckinConfirmedEventData
  | { userId: number }
  | Record<string, any>;

export interface QuestEvent {
  type: 'quest_created' | 'user_joined' | 'quest_completed' | 'requirement_updated' | 'contributer_added' | 'contributer_removed' | 'step_volunteer_added' | 'checkin_confirmed';
  questId: number;
  data: QuestEventData;
  timestamp: Date;
}

@Injectable()
export class QuestEventsService {
  private readonly logger = new Logger(QuestEventsService.name);
  private questEvents$ = new Subject<QuestEvent>();

  /**
   * Эмитить событие создания квеста
   */
  emitQuestCreated(questId: number, questData: QuestCreatedEventData) {
    this.logger.log(`Emitting quest_created event for quest ${questId}`);
    this.questEvents$.next({
      type: 'quest_created',
      questId,
      data: questData,
      timestamp: new Date(),
    });
  }

  /**
   * Эмитить событие присоединения пользователя к квесту
   */
  emitUserJoined(questId: number, userId: number, userData: UserJoinedEventData) {
    this.logger.log(`Emitting user_joined event for quest ${questId}, user ${userId}`);
    this.questEvents$.next({
      type: 'user_joined',
      questId,
      data: {
        userId,
        ...userData,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Эмитить событие завершения квеста
   */
  emitQuestCompleted(questId: number, userId: number, questData: QuestCompletedEventData) {
    this.logger.log(`Emitting quest_completed event for quest ${questId}, user ${userId}`);
    this.questEvents$.next({
      type: 'quest_completed',
      questId,
      data: {
        userId,
        ...questData,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Эмитить событие обновления требования в этапе квеста
   */
  emitRequirementUpdated(questId: number, steps: QuestStep[]) {
    this.logger.log(`Emitting requirement_updated event for quest ${questId}`);
    this.questEvents$.next({
      type: 'requirement_updated',
      questId,
      data: {
        steps,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Эмитить событие добавления contributer
   */
  emitContributerAdded(questId: number, userId: number) {
    this.logger.log(`Emitting contributer_added event for quest ${questId}, user ${userId}`);
    this.questEvents$.next({
      type: 'contributer_added',
      questId,
      data: {
        userId,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Эмитить событие удаления contributer
   */
  emitContributerRemoved(questId: number, userId: number) {
    this.logger.log(`Emitting contributer_removed event for quest ${questId}, user ${userId}`);
    this.questEvents$.next({
      type: 'contributer_removed',
      questId,
      data: {
        userId,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Эмитить событие добавления вклада в этап (finance/material)
   */
  emitStepVolunteerAdded(questId: number, stepType: 'finance' | 'material', userId: number, contributeValue: number) {
    this.logger.log(`Emitting step_volunteer_added event for quest ${questId}, type ${stepType}, user ${userId}`);
    this.questEvents$.next({
      type: 'step_volunteer_added',
      questId,
      data: {
        stepType,
        userId,
        contributeValue,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Эмитить событие подтверждения checkin
   */
  emitCheckinConfirmed(questId: number, stepType: 'finance' | 'material' | 'contributers', userId: number) {
    this.logger.log(`Emitting checkin_confirmed event for quest ${questId}, type ${stepType}, user ${userId}`);
    this.questEvents$.next({
      type: 'checkin_confirmed',
      questId,
      data: {
        stepType,
        userId,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Получить Observable для SSE потока
   */
  getQuestEvents(): Observable<MessageEvent> {
    return this.questEvents$.asObservable().pipe(
      map((event: QuestEvent) => {
        return {
          data: JSON.stringify(event),
        } as MessageEvent;
      }),
    );
  }

  /**
   * Получить Observable для конкретного квеста
   */
  getQuestEventsByQuestId(questId: number): Observable<MessageEvent> {
    return this.questEvents$.asObservable().pipe(
      filter((event: QuestEvent) => event.questId === questId),
      map((event: QuestEvent) => {
        return {
          data: JSON.stringify(event),
        } as MessageEvent;
      }),
    );
  }

  /**
   * Сырые события для внутренних обработчиков доменных событий
   */
  getRawEvents(): Observable<QuestEvent> {
    return this.questEvents$.asObservable();
  }
}

