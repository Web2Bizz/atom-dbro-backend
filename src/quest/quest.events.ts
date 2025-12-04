import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

export interface QuestEvent {
  type: 'quest_created' | 'user_joined' | 'quest_completed' | 'requirement_updated' | 'contributer_added' | 'contributer_removed' | 'step_volunteer_added' | 'checkin_confirmed';
  questId: number;
  data: any;
  timestamp: Date;
}

@Injectable()
export class QuestEventsService {
  private readonly logger = new Logger(QuestEventsService.name);
  private questEvents$ = new Subject<QuestEvent>();

  /**
   * Эмитить событие создания квеста
   */
  emitQuestCreated(questId: number, questData: any) {
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
  emitUserJoined(questId: number, userId: number, userData: any) {
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
  emitQuestCompleted(questId: number, userId: number, questData: any) {
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
  emitRequirementUpdated(questId: number, steps: any) {
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

