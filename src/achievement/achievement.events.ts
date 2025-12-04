import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface AchievementEvent {
  type: 'achievement_awarded';
  data: {
    userId: number;
    achievementId: number;
    questId?: number;
    experienceReward?: number;
  };
  timestamp: Date;
}

@Injectable()
export class AchievementEventsService {
  private readonly logger = new Logger(AchievementEventsService.name);
  private events$ = new Subject<AchievementEvent>();

  /**
   * Эмитить событие выдачи достижения пользователю
   */
  emitAchievementAwarded(data: AchievementEvent['data']) {
    this.logger.log(
      `Emitting achievement_awarded: user=${data.userId}, achievement=${data.achievementId}, quest=${data.questId}`,
    );

    this.events$.next({
      type: 'achievement_awarded',
      data,
      timestamp: new Date(),
    });
  }

  /**
   * Сырые события для внутренних обработчиков доменных событий
   */
  getRawEvents(): Observable<AchievementEvent> {
    return this.events$.asObservable();
  }
}

