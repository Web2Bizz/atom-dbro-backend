import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

export interface QuestEvent {
  type: 'quest_created' | 'user_joined' | 'quest_completed';
  questId: number;
  data: any;
  timestamp: Date;
}

@Injectable()
export class QuestEventsService {
  private questEvents$ = new Subject<QuestEvent>();

  /**
   * Эмитить событие создания квеста
   */
  emitQuestCreated(questId: number, questData: any) {
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
}

