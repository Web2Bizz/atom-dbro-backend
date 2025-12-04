import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { filter } from 'rxjs/operators';
import { QuestEventsService, QuestEvent } from './quest.events';
import { AchievementService } from '../achievement/achievement.service';
import { AchievementEventsService } from '../achievement/achievement.events';
import { ConflictException, NotFoundException } from '@nestjs/common';

@Injectable()
export class QuestEventsHandler implements OnModuleInit {
  private readonly logger = new Logger(QuestEventsHandler.name);

  constructor(
    private readonly questEventsService: QuestEventsService,
    private readonly achievementService: AchievementService,
    private readonly achievementEvents: AchievementEventsService,
  ) {}

  onModuleInit() {
    this.questEventsService
      .getRawEvents()
      .pipe(filter((event: QuestEvent) => event.type === 'quest_completed'))
      .subscribe({
        next: (event) => {
          void this.handleQuestCompleted(event);
        },
        error: (error) => {
          this.logger.error('Error in quest events stream', error);
        },
      });
  }

  private async handleQuestCompleted(event: QuestEvent): Promise<void> {
    const { questId, data } = event;
    const { userId, experienceReward, achievementId } = data || {};

    if (!userId) {
      this.logger.warn('Received quest_completed event without userId, skipping');
      return;
    }

    if (!achievementId) {
      this.logger.log(
        `quest_completed for user ${userId}, quest ${questId} without achievementId – no achievement to award`,
      );
      return;
    }

    // 1. Пытаемся выдать достижение
    try {
      const userAchievement = await this.achievementService.assignToUser(userId, achievementId);

      this.logger.log(
        `Achievement ${achievementId} assigned to user ${userId} for quest ${questId}, userAchievementId=${userAchievement.id}`,
      );

      // 2. При успешной выдаче эмитим событие achievement_awarded
      this.achievementEvents.emitAchievementAwarded({
        userId,
        achievementId,
        questId,
        experienceReward,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        // Достижение уже есть — считаем, что награда уже была, не эмитим повторное событие
        this.logger.log(
          `User ${userId} already has achievement ${achievementId}, skip awarding again`,
        );
        return;
      }

      if (error instanceof NotFoundException) {
        this.logger.warn(
          `Failed to assign achievement ${achievementId} to user ${userId} on quest_completed: ${error.message}`,
        );
        return;
      }

      // Неожиданные ошибки логируем как ошибки
      this.logger.error(
        `Unexpected error assigning achievement ${achievementId} to user ${userId} on quest_completed`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}


