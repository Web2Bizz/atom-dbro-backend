import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { filter } from 'rxjs/operators';
import { QuestEventsService, QuestEvent } from './quest.events';
import { AchievementService } from '../achievement/achievement.service';
import { AchievementEventsService } from '../achievement/achievement.events';
import { QuestService } from './quest.service';
import { QuestCacheService } from './quest-cache.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

@Injectable()
export class QuestEventsHandler implements OnModuleInit {
  private readonly logger = new Logger(QuestEventsHandler.name);

  constructor(
    private readonly questEventsService: QuestEventsService,
    private readonly achievementService: AchievementService,
    private readonly achievementEvents: AchievementEventsService,
    @Inject(forwardRef(() => QuestService))
    private readonly questService: QuestService,
    @Inject(forwardRef(() => QuestCacheService))
    private readonly questCacheService: QuestCacheService,
  ) {}

  onModuleInit() {
    // Обработка события завершения квеста
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

    // Обработка событий для синхронизации requirement currentValue
    this.questEventsService
      .getRawEvents()
      .pipe(
        filter((event: QuestEvent) =>
          event.type === 'contributer_added' ||
          event.type === 'contributer_removed' ||
          event.type === 'step_volunteer_added' ||
          event.type === 'checkin_confirmed'
        )
      )
      .subscribe({
        next: (event) => {
          void this.handleRequirementSync(event);
        },
        error: (error) => {
          this.logger.error('Error in requirement sync events stream', error);
        },
      });
  }

  private async handleQuestCompleted(event: QuestEvent): Promise<void> {
    const { questId, data } = event;
    const { userId, experienceReward, achievementId } = (data as any) || {};

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

  /**
   * Обработка событий для синхронизации requirement currentValue
   */
  private async handleRequirementSync(event: QuestEvent): Promise<void> {
    const { questId, type, data } = event;

    try {
      if (type === 'contributer_added' || type === 'contributer_removed') {
        // Синхронизируем currentValue для типа contributers
        await this.questService.syncRequirementCurrentValue(questId, 'contributers');
        this.logger.debug(`Synced requirement currentValue for quest ${questId}, type contributers`);
      } else if (type === 'step_volunteer_added') {
        // Синхронизируем currentValue для типа finance или material
        const stepType = (data as any)?.stepType as 'finance' | 'material';
        if (stepType) {
          await this.questService.syncRequirementCurrentValue(questId, stepType);
          this.logger.debug(`Synced requirement currentValue for quest ${questId}, type ${stepType}`);
        }
      } else if (type === 'checkin_confirmed') {
        // Синхронизируем currentValue в зависимости от типа этапа
        const stepType = (data as any)?.stepType as 'finance' | 'material' | 'contributers';
        if (stepType) {
          await this.questService.syncRequirementCurrentValue(questId, stepType);
          this.logger.debug(`Synced requirement currentValue for quest ${questId}, type ${stepType}`);
        }
      }

      // Инвалидируем кеш квеста после синхронизации
      await this.questCacheService.invalidateQuest(questId);

      // Пересчитываем и сохраняем квест в кеш с актуальными значениями
      const updatedQuest = await this.questCacheService.getQuest(questId);
      if (updatedQuest) {
        await this.questCacheService.setQuest(questId, updatedQuest);
      }
    } catch (error) {
      this.logger.error(
        `Error syncing requirement currentValue for quest ${questId} on event ${type}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}


